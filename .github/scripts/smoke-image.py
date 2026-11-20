#!/usr/bin/env python3
"""Verify the production image against an empty isolated PostgreSQL and RabbitMQ."""
import json
import pathlib
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

image = sys.argv[1]
network = 'product-smoke-' + uuid.uuid4().hex[:10]
containers = []


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True).strip()


def start(name, *args):
    containers.append(name)
    docker('run', '-d', '--name', name, '--network', network, *args)


def wait(name, *command):
    for _ in range(60):
        if subprocess.run(['docker', 'exec', name, *command], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
            return
        time.sleep(1)
    raise RuntimeError(f'{name} startup timeout')


product_check = r'''
const assert = require('node:assert/strict');
const amqp = require('amqplib');
const { randomUUID } = require('node:crypto');
const { ClientProxyFactory, Transport } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');
const client = ClientProxyFactory.create({transport: Transport.RMQ, options: {
  urls: ['amqp://smoke:smoke@broker:5672'],
  queue: 'product.v2.commands', queueOptions: {durable: true},
}});
const request = (cmd, data) => firstValueFrom(client.send({cmd: 'catalog.v2.' + cmd}, data).pipe(timeout(5000)));
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
(async () => {
  let broker;
  try {
    broker = await amqp.connect('amqp://smoke:smoke@broker:5672');
    const channel = await broker.createChannel();
    await channel.assertExchange('event.exchange', 'topic', {durable: true});
    const queue = await channel.assertQueue('', {exclusive: true});
    await channel.bindQueue(queue.queue, 'event.exchange', 'product.*');
    const events = [];
    await channel.consume(queue.queue, message => {
      if (message) events.push(JSON.parse(message.content.toString()).data);
    }, {noAck: true});
    assert.equal((await request('product.getAll', {})).total, 0);
    const imageUuid = randomUUID();
    const publishFile = (pattern, data) => channel.publish('event.exchange', pattern,
      Buffer.from(JSON.stringify({pattern, data})), {persistent: true});
    publishFile('file_srv.file.create', {uuid: imageUuid, name: 'original.png'});
    let image;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { image = await request('image.getByUuid', {uuid: imageUuid}); break; }
      catch (error) { if (error.statusCode !== 404) throw error; }
      await pause();
    }
    assert.equal(image?.fileName, 'original.png');
    publishFile('file_srv.file.update', {uuid: imageUuid, name: 'updated.png', version: 1});
    for (let attempt = 0; attempt < 40; attempt++) {
      image = await request('image.getByUuid', {uuid: imageUuid});
      if (image.version === 2) break;
      await pause();
    }
    assert.equal(image.version, 2);
    assert.equal(image.fileName, 'updated.png');
    await request('brand.create', {code: 'deployment-brand', name: 'Deployment Brand'});
    const type = await request('productType.create', {name: 'Deployment type'});
    let product = await request('product.create', {
      name: 'Deployment product', brandCode: 'deployment-brand', typeUuid: type.uuid, typeVersion: type.version,
      variants: [
        {name: 'Black', images: [{imageUuid, sortOrder: 0}]},
        {name: 'White'},
      ],
    });
    assert.equal(product.version, 1);
    assert.equal(product.variants.length, 2);
    assert.equal(product.variants.find(variant => variant.name === 'Black').images[0].fileName, 'updated.png');
    product = await request('product.update', {uuid: product.uuid, version: product.version,
      typeVersion: type.version, name: 'Updated deployment product'});
    assert.equal(product.version, 2);
    product = await request('product.variant.create', {uuid: product.uuid, version: product.version,
      typeVersion: type.version, variant: {name: 'Blue'}});
    assert.equal(product.version, 3);
    const blue = product.variants.find(variant => variant.name === 'Blue');
    product = await request('product.variant.update', {uuid: product.uuid, variantUuid: blue.uuid,
      version: product.version, typeVersion: type.version, name: 'Navy blue'});
    assert.equal(product.version, 4);
    const current = await request('product.getByUuid', {uuid: product.uuid});
    assert.equal(current.name, 'Updated deployment product');
    assert.equal(current.variants.length, 3);
    assert.ok(current.variants.some(variant => variant.name === 'Navy blue'));
    const search = await request('product.getAll', {term: 'Upda depl'});
    assert.equal(search.total, 1);
    assert.equal(search.items[0].uuid, product.uuid);
    await assert.rejects(request('product.update', {uuid: product.uuid, version: 1,
      typeVersion: type.version, name: 'Stale update'}), error => error.statusCode === 409);
    await assert.rejects(request('product.create', {name: '', brandCode: 'deployment-brand',
      typeUuid: type.uuid, typeVersion: type.version, variants: []}), error => error.statusCode === 400);
    for (let attempt = 0; attempt < 40 && events.length < 4; attempt++) await pause();
    assert.deepEqual(events.map(event => Number(event.aggregateVersion)), [1, 2, 3, 4]);
    assert.deepEqual(events.map(event => event.eventType), [
      'product.created', 'product.updated', 'product.updated', 'product.updated',
    ]);
    assert.equal(events[3].payload.uuid, product.uuid);
    assert.equal(events[3].payload.variants.length, 3);
    const empty = await request('product.create', {name: 'Separate product process', brandCode: 'deployment-brand',
      typeUuid: type.uuid, typeVersion: type.version, variants: []});
    assert.equal(empty.variants.length, 0);
    let matrix = empty;
    for (let index = 0; index < 15; index++) {
      matrix = await request('product.variant.create', {uuid: matrix.uuid, version: matrix.version,
        typeVersion: type.version, variant: {name: 'Variant ' + index, images: [{imageUuid, sortOrder: 0}]}});
    }
    assert.equal(matrix.variants.length, 15);
    const variantList = await request('product.variant.getAll', {uuid: matrix.uuid});
    assert.equal(variantList.items.length, 15);
    const detail = await request('product.variant.getByUuid', {uuid: matrix.uuid, variantUuid: matrix.variants[0].uuid});
    assert.equal(detail.uuid, matrix.variants[0].uuid);
    assert.equal(detail.productUuid, matrix.uuid);
    assert.equal(detail.version, matrix.version);
    await assert.rejects(request('product.variant.getByUuid', {uuid: product.uuid, variantUuid: detail.uuid}),
      error => error.statusCode === 404);
    console.log('RMQ catalog CRUD/search, variants/images, file projection, 400/409 and ordered full outbox snapshots passed');
  } finally { await client.close(); if (broker) await broker.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''

product_memory_check = r'''
const assert = require('node:assert/strict');
require('reflect-metadata');
const { DataSource } = require('typeorm');
const { databaseOptions } = require('./service/dist/database/database.options.js');
const { ProductSnapshotService } = require('./service/dist/integration/outbox/product-snapshot.service.js');
const database = new DataSource(databaseOptions(process.env));
(async () => {
  try {
    await database.initialize();
    const [product] = await database.query("SELECT uuid FROM product WHERE name='Separate product process'");
    assert.ok(product);
    const snapshots = new ProductSnapshotService();
    const samples = [];
    for (let index = 0; index < 40; index++) {
      const snapshot = await snapshots.get(database.manager, product.uuid);
      assert.equal(snapshot.variants.length, 15);
      assert.ok(snapshot.variants.every(variant => variant.images.length === 1));
      global.gc();
      if (index >= 5) samples.push(process.memoryUsage().heapUsed);
    }
    assert.ok(Math.max(...samples) - Math.min(...samples) < 16 * 1024 * 1024);
    console.log('15 variants, 40 compiled snapshot reads, 128 MiB heap limit: passed; retained MiB=' +
      Math.ceil(Math.max(...samples) / 1024 / 1024));
  } finally { await database.destroy(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''

try:
    docker('network', 'create', network)
    broker = network + '-broker'
    start(broker, '--user', '999:999', '--tmpfs', '/var/lib/rabbitmq:uid=999,gid=999,mode=0700',
          '--network-alias', 'broker', '-e', 'RABBITMQ_DEFAULT_USER=smoke', '-e', 'RABBITMQ_DEFAULT_PASS=smoke',
          'rabbitmq:4.4.1-management@sha256:61f90c401a5b5ed2486771973ea92ad66046471eacab9c9149f1a6e091c91677')
    wait(broker, 'rabbitmq-diagnostics', '-q', 'ping')
    database = network + '-db'
    start(database, '--network-alias', 'database', '-e', 'POSTGRES_USER=product_srv_v2',
          '-e', 'POSTGRES_PASSWORD=smoke', '-e', 'POSTGRES_DB=product_srv_v2',
          'postgres:16.16-bookworm@sha256:ce3efec6bc404f6b15ebf5d9bed6b45a9d4655aea238d7dacc3467ccb05a1175')
    wait(database, 'pg_isready', '-U', 'product_srv_v2')
    values = {}
    for line in pathlib.Path('code/service/.env.example').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key] = value.strip().strip('"')
    values.update(PORT='8080', PRODUCT_AMQP_URL='amqp://smoke:smoke@broker:5672',
                  PRODUCT_DATABASE_HOST='database', PRODUCT_DATABASE_PORT='5432',
                  PRODUCT_DATABASE_USERNAME='product_srv_v2', PRODUCT_DATABASE_PASSWORD='smoke',
                  PRODUCT_DATABASE_NAME='product_srv_v2')
    with tempfile.TemporaryDirectory() as directory:
        env = pathlib.Path(directory) / '.env'
        env.write_text(''.join(f'{key}={value}\n' for key, value in values.items()))
        env.chmod(0o644)
        mount = ['--mount', f'type=bind,src={env},dst=/app/.env,readonly']
        for _ in range(2):
            docker('run', '--rm', '--network', network, *mount, image, 'node', '--env-file=.env',
                   'node_modules/typeorm/cli.js', '-d', 'service/dist/database/data-source.js', 'migration:run')
        migration_count = docker('exec', database, 'psql', '-U', 'product_srv_v2', '-d', 'product_srv_v2', '-Atc',
                                 'SELECT count(*) FROM migrations')
        assert migration_count == '7', f'Expected seven migrations, got {migration_count}'
        app = network + '-app'
        start(app, '-e', 'NODE_OPTIONS=--max-old-space-size=256', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--tmpfs', '/tmp',
              '-p', '127.0.0.1::8080', *mount, image)
        host_port = json.loads(docker('inspect', app))[0]['NetworkSettings']['Ports']['8080/tcp'][0]['HostPort']
        for _ in range(90):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{host_port}/health', timeout=2) as response:
                    if json.load(response)['status'] == 'ok':
                        break
            except (OSError, ValueError):
                pass
            if docker('inspect', '--format', '{{.State.Running}}', app) != 'true':
                raise RuntimeError('Product exited during startup')
            time.sleep(1)
        else:
            raise RuntimeError('Product readiness timeout')
        assert docker('exec', app, 'id', '-u') == '1000'
        print(docker('exec', app, 'node', '-e', product_check))
        print(docker('exec', app, 'node', '--env-file=.env', '--expose-gc', '--max-old-space-size=128', '-e', product_memory_check))
        # Disconnect only the isolated broker to verify the readiness contract.
        docker('stop', '--time', '5', broker)
        for _ in range(20):
            try:
                urllib.request.urlopen(f'http://127.0.0.1:{host_port}/health', timeout=2).close()
            except urllib.error.HTTPError as error:
                assert error.code == 503
                break
            time.sleep(1)
        else:
            raise RuntimeError('Product stayed ready after its broker disconnected')
        print('Product: fresh database, repeat migration, mounted .env, non-root image and readiness passed')
except Exception:
    for name in containers:
        subprocess.run(['docker', 'logs', '--tail', '30', name], check=False)
    raise
finally:
    for name in reversed(containers):
        subprocess.run(['docker', 'rm', '-f', '-v', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['docker', 'network', 'rm', network], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
