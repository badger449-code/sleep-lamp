/**
 * 浏览器自动化测试
 * 功能：
 * 1. 打开网页
 * 2. 捕获控制台日志
 * 3. 检测错误
 * 4. 测试 WebSocket 连接
 */

import puppeteer from 'puppeteer-core';

const TEST_URL = 'http://localhost:5173/';
const CHROME_PATH = '/usr/bin/google-chrome';

async function runTest() {
  console.log('🧪 开始浏览器自动化测试\n');
  console.log('=' .repeat(60));
  
  let browser;
  try {
    // 启动浏览器（无头模式）
    console.log('\n🌐 启动 Chrome 浏览器...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // 收集控制台日志
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      
      // 只显示重要日志
      if (text.includes('Connected') || 
          text.includes('WebSocket') || 
          text.includes('error') ||
          text.includes('✅') ||
          text.includes('❌') ||
          text.includes('🔄')) {
        console.log(`📝 [${msg.type()}] ${text}`);
      }
    });
    
    page.on('pageerror', err => {
      errors.push(err.message);
      console.error(`🚨 页面错误：${err.message}`);
    });
    
    page.on('requestfailed', request => {
      console.error(`❌ 请求失败：${request.url()}`);
    });
    
    // 打开页面
    console.log(`\n🔗 打开 ${TEST_URL}...`);
    await page.goto(TEST_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('✅ 页面加载完成');
    
    // 等待 5 秒，让 WebSocket 连接
    console.log('\n⏳ 等待 WebSocket 连接...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 截图
    console.log('📸 保存截图...');
    await page.screenshot({ 
      path: '/home/admin/apps/sleep-lamp/test-screenshot.png',
      fullPage: true 
    });
    
    // 分析结果
    console.log('\n' + '=' .repeat(60));
    console.log('📊 测试结果分析');
    console.log('=' .repeat(60));
    
    // 检查 WebSocket 连接
    const wsConnected = consoleLogs.some(log => 
      log.includes('Connected to Story Server') || 
      log.includes('✅ Connected')
    );
    
    const wsDisconnected = consoleLogs.some(log => 
      log.includes('Disconnected') ||
      log.includes('❌')
    );
    
    const hasErrors = errors.length > 0;
    
    console.log('\n【WebSocket 连接】');
    if (wsConnected) {
      console.log('✅ 已连接');
    } else if (wsDisconnected) {
      console.log('❌ 连接失败/断开');
    } else {
      console.log('⚠️ 状态未知');
    }
    
    console.log('\n【错误检测】');
    if (hasErrors) {
      console.log(`❌ 发现 ${errors.length} 个错误:`);
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log('✅ 没有发现错误');
    }
    
    console.log('\n【控制台日志摘要】');
    consoleLogs.slice(-10).forEach(log => {
      console.log(`  ${log}`);
    });
    
    // 最终结论
    console.log('\n' + '=' .repeat(60));
    if (wsConnected && !hasErrors) {
      console.log('✅ 测试通过！一切正常！');
      process.exit(0);
    } else {
      console.log('⚠️ 测试完成，但有问题需要修复');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    console.error('\n可能原因：');
    console.error('1. Chrome 浏览器未安装');
    console.error('2. 前端服务未启动');
    console.error('3. 页面加载超时');
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runTest();
