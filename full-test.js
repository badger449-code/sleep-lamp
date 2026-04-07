/**
 * Sleep Lamp 全量测试脚本
 * 验证所有已实现功能
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs/promises';

const TEST_URL = 'http://localhost:5173/';
const CHROME_PATH = '/usr/bin/google-chrome';

async function fullTest() {
  console.log('🧪 开始 Sleep Lamp 全量测试\n');
  console.log('='.repeat(60));

  let browser;
  try {
    // 启动浏览器
    console.log('🌐 启动 Chrome 浏览器...');
    browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding'
      ]
    });

    const page = await browser.newPage();

    // 设置屏幕常亮
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: async (type) => {
            console.log(`🔧 WakeLock requested for ${type}`);
            return {
              release: () => console.log('🔓 WakeLock released'),
              addEventListener: () => {},
              removeEventListener: () => {}
            };
          }
        }
      });
    });

    // 收集控制台日志
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text: text, timestamp: new Date().toISOString() });
      
      // 重要日志打印
      if (text.includes('Connected') || 
          text.includes('WebSocket') || 
          text.includes('error') ||
          text.includes('✅') ||
          text.includes('❌') ||
          text.includes('🔄') ||
          text.includes('WakeLock')) {
        console.log(`📝 [${msg.type()}] ${text}`);
      }
    });
    
    page.on('pageerror', err => {
      errors.push({ message: err.message, timestamp: new Date().toISOString() });
      console.error(`🚨 页面错误：${err.message}`);
    });

    // 设置页面尺寸模拟手机
    await page.setViewport({ width: 375, height: 812 });
    
    console.log(`\n🔗 访问测试页面：${TEST_URL}`);
    await page.goto(TEST_URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('✅ 页面加载完成');
    
    // 等待 5 秒让 WebSocket 连接
    console.log('\n⏳ 等待 WebSocket 连接...');
    await await page.waitForTimeout(5000);

    // 检查页面元素
    console.log('\n🔍 检查页面元素...');
    const elements = await page.evaluate(() => {
      return {
        hasMicButton: !!document.querySelector('button[ref*="mic"]'),
        hasTextInput: !!document.querySelector('input[type="text"]'),
        hasNoiseControl: !!document.querySelector('div').outerHTML.includes('NoiseControl'),
        hasVoiceSelector: !!document.querySelector('div').outerHTML.includes('VoiceSelector'),
        hasSleepTimer: !!document.querySelector('div').outerHTML.includes('SleepTimer'),
        hasWakeWordButton: !!document.querySelector('button').outerHTML.includes('唤醒'),
        hasKeepScreenOnButton: !!document.querySelector('button').outerHTML.includes('常亮') || !!document.querySelector('svg').outerHTML.includes('rect x="2" y="3" width="20" height="14"')
      };
    });

    console.log('📋 元素检查结果：');
    Object.entries(elements).forEach(([element, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${element}: ${exists ? '存在' : '缺失'}`);
    });

    // 测试定时器功能
    console.log('\n⏰ 测试睡眠定时器...');
    const sleepTimerExists = elements.hasSleepTimer;
    if (sleepTimerExists) {
      console.log('  ✅ 睡眠定时器组件存在');
      
      // 尝试点击 15 分钟按钮
      const fifteenMinBtn = await page.$('button:has-text("15分钟")');
      if (fifteenMinBtn) {
        await fifteenMinBtn.click();
        console.log('  ✅ 15分钟按钮点击成功');
      } else {
        console.log('  ⚠️ 未找到 15分钟按钮');
      }
    } else {
      console.log('  ❌ 睡眠定时器组件缺失');
    }

    // 测试屏幕常亮按钮
    console.log('\n📱 测试屏幕常亮功能...');
    const keepScreenOnExists = elements.hasKeepScreenOnButton;
    if (keepScreenOnExists) {
      console.log('  ✅ 屏幕常亮按钮存在');
      
      // 尝试点击屏幕常亮按钮
      const screenOnBtn = await page.$('button:has-text("常亮")');
      if (screenOnBtn) {
        await screenOnBtn.click();
        console.log('  ✅ 屏幕常亮按钮点击成功');
        await await page.waitForTimeout(1000);
        await screenOnBtn.click(); // 再点一次关掉
        console.log('  ✅ 屏幕常亮按钮切换测试完成');
      } else {
        console.log('  ⚠️ 未找到屏幕常亮按钮');
      }
    } else {
      console.log('  ❌ 屏幕常亮按钮缺失');
    }

    // 检查 WebSocket 连接状态
    console.log('\n🔗 检查 WebSocket 连接...');
    const wsConnected = consoleLogs.some(log => 
      log.text.includes('Connected to Story Server') || 
      log.text.includes('✅ Connected') ||
      log.text.includes('WebSocket')
    );
    
    console.log(`  ${wsConnected ? '✅' : '❌'} WebSocket 连接状态：${wsConnected ? '已连接' : '未连接'}`);

    // 检查是否有错误
    console.log('\n⚠️ 检查错误...');
    if (errors.length > 0) {
      console.log(`  ❌ 发现 ${errors.length} 个错误:`);
      errors.forEach((err, i) => {
        console.log(`    ${i + 1}. ${err.message}`);
      });
    } else {
      console.log('  ✅ 没有发现错误');
    }

    // 保存测试报告
    const report = {
      timestamp: new Date().toISOString(),
      url: TEST_URL,
      elements: elements,
      wsConnected: wsConnected,
      errorCount: errors.length,
      consoleLogs: consoleLogs,
      errors: errors
    };

    await fs.writeFile('/home/admin/apps/sleep-lamp/test-report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 测试报告已保存：/home/admin/apps/sleep-lamp/test-report.json');

    // 截图
    console.log('📸 保存测试截图...');
    await page.screenshot({ 
      path: '/home/admin/apps/sleep-lamp/full-test-screenshot.png',
      fullPage: true 
    });

    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));
    
    const passedElements = Object.values(elements).filter(exists => exists).length;
    const totalElements = Object.keys(elements).length;
    
    console.log(`\n【组件完整性】${passedElements}/${totalElements} 个组件正常`);
    console.log(`【WebSocket】${wsConnected ? '✅' : '❌'} 连接正常`);
    console.log(`【错误数量】${errors.length} 个`);
    
    if (passedElements === totalElements && wsConnected && errors.length === 0) {
      console.log('\n🎉 全部测试通过！功能正常！');
      process.exit(0);
    } else {
      console.log('\n⚠️ 部分测试未通过，请检查日志');
      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

fullTest();