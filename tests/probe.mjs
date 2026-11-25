import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export const name = 'biodata-search-live-check';
export const inject = ['agents', 'tools'];

export function apply(ctx) {
  async function check() {
    const toolNames = ['list_databases', 'search_records', 'get_record'];
    const publicName = name => `mcp__biodata__${name}`;
    const deadline = Date.now() + 120_000;
    while (toolNames.some(name => !ctx.tools.get(publicName(name)))) {
      assert.ok(Date.now() < deadline, 'DSH 未注册 BioData Search 的三个工具');
      await delay(200);
    }

    const handle = await ctx.agents.create({sessionId: randomUUID(), meta: {cwd: process.cwd()}});
    async function call(name, args) {
      const batch = await ctx.tools.execute({
        agent: handle.agent,
        signal: AbortSignal.timeout(90_000),
        calls: [{type: 'tool-call', id: randomUUID(), name: publicName(name), arguments: JSON.stringify(args)}],
      });
      const result = batch.results[0].result;
      assert.equal(result.isError, false, JSON.stringify(result.content));
      assert.ok(result.value.structuredContent, `${name} 缺少结构化结果`);
      return result.value.structuredContent;
    }

    try {
      const catalogue = await call('list_databases', {});
      const available = catalogue.databases.map(entry => entry.database);
      for (const database of ['ngdc:omix', 'ncbi:pubmed', 'europepmc:articles', 'uniprot:uniprotkb', 'rcsb:entry']) {
        assert.ok(available.includes(database), database);
      }

      const selected = ['uniprot:uniprotkb', 'rcsb:entry'];
      const search = await call('search_records', {query: 'hemoglobin', providers: ['uniprot', 'rcsb'], limit: 1});
      assert.deepEqual(search.results.map(group => group.database).sort(), selected.toSorted());
      for (const group of search.results) {
        assert.ok(group.total > 0, JSON.stringify(group));
        assert.equal(group.records.length, 1, group.database);
        const [record] = group.records;
        assert.ok(record.id && record.title && new URL(record.url).protocol === 'https:');
      }

      const detail = await call('get_record', {database: 'uniprot:uniprotkb', identifier: 'P69905'});
      assert.equal(detail.record.id, 'P69905');
      assert.equal(new URL(detail.record.url).hostname, 'www.uniprot.org');
      assert.ok(new URL(detail.record.url).pathname.includes('/P69905'));
      const paper = await call('get_record', {database: 'europepmc:articles', identifier: 'MED:29535343'});
      assert.equal(paper.record.id, 'MED:29535343');
      assert.equal(paper.record.url, 'https://europepmc.org/article/MED/29535343');
      console.log('真实 DSH 工具已完成来源选择、跨库检索和编号回查。', detail.record.url, paper.record.url);
    } finally {
      await handle.dispose();
    }
  }

  setImmediate(() => {
    check().then(
      () => process.stdout.write('BIODATA_DSH_LIVE_OK\n', () => process.exit(0)),
      error => process.stderr.write(`${error.stack}\n`, () => process.exit(1)),
    );
  });
}
