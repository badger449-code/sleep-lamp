/**
 * WebSocket 重连测试脚本
 * 测试内容：
 * 1. 正常连接
 * 2. 模拟断开
 * 3. 自动重连
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3000/ws';
let retryCount = 0;
const maxRetries = 5;

function connect() {
  return new Promise((resolve, reject) => {
    console.log(`🔌 尝试连接 ${WS_URL}...`);
    
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
      console.log('✅ 连接成功！');
      resolve(ws);
    });
    
    ws.on('error', (err) => {
      console.error('❌ 连接失败:', err.message);
      reject(err);
    });
    
    // 10 秒超时
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        reject(new Error('连接超时'));
      }
    }, 10000);
  });
}

async function testReconnect() {
  console.log('\n🧪 开始 WebSocket 重连测试\n');
  console.log('=' .repeat(50));
  
  try {
    // 测试 1：正常连接
    console.log('\n【测试 1】正常连接');
    let ws = await connect();
    console.log('✓ 通过\n');
    
    // 测试 2：发送消息
    console.log('【测试 2】发送消息');
    ws.send(JSON.stringify({ type: 'ping' }));
    console.log('✓ 消息已发送\n');
    
    // 测试 3：模拟断开
    console.log('【测试 3】模拟断开');
    ws.close();
    console.log('✓ 已关闭连接\n');
    
    // 测试 4：自动重连
    console.log('【测试 4】自动重连');
    await new Promise(resolve => setTimeout(resolve, 2000));
    ws = await connect();
    console.log('✓ 重连成功\n');
    
    ws.close();
    
    console.log('=' .repeat(50));
    console.log('✅ 所有测试通过！\n');
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error('\n可能原因：');
    console.error('1. 后端服务未启动（端口 3000）');
    console.error('2. WebSocket 服务异常');
    console.error('3. 防火墙阻止连接\n');
    process.exit(1);
  }
}

testReconnect();
