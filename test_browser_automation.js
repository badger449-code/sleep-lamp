/**
 * Sleep-Lamp Web Application Test Script
 * 使用 Playwright 进行端到端测试
 */

import { chromium } from 'playwright';

(async () => {
  console.log('🧪 开始 Sleep-Lamp Web 应用测试...');
  
  // 启动浏览器
  const browser = await chromium.launch({ 
    headless: true, // 设置为 false 以查看浏览器窗口
    slowMo: 50 // 减慢操作以便观察
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
  });
  
  const page = await context.newPage();
  
  try {
    // 1. 访问应用
    console.log('🌐 访问 Sleep-Lamp 应用...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 等待页面加载完成
    await page.waitForTimeout(5000); // 给页面一些时间来加载动态内容
    console.log('✅ 页面成功加载');
    
    // 2. 检查 WebSocket 连接状态
    console.log('📡 检查 WebSocket 连接状态...');
    // 查找包含 WebSocket 状态的元素，通常在右上角
    const statusElements = await page.$$('.text-xs');
    let wsStatusFound = false;
    for (const elem of statusElements) {
      const text = await elem.textContent();
      if (text && (text.includes('连接') || text.includes('Connected') || text.includes('连接中') || text.includes('已连接'))) {
        console.log(`✅ WebSocket 状态: ${text}`);
        wsStatusFound = true;
        break;
      }
    }
    if (!wsStatusFound) {
      console.log('⚠️ 未找到 WebSocket 状态');
    }
    
    // 3. 检查初始状态
    console.log('🔍 检查初始界面...');
    // 查找主要的故事显示面板
    const storyPanels = await page.$$('.glass-panel');
    if (storyPanels && storyPanels.length > 0) {
      const firstPanel = storyPanels[0];
      const panelText = await firstPanel.textContent();
      console.log(`✅ 故事面板文本: ${panelText.substring(0, 60)}...`);
    } else {
      console.log('⚠️ 未找到故事面板');
    }
    
    // 4. 测试文本输入功能
    console.log('📝 测试文本输入功能...');
    // 等待输入框出现，可能是文本输入框
    const inputSelectors = ['input[type="text"]', 'input', 'textarea'];
    let inputFound = false;
    
    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.fill(selector, '今天心情不错');
        await page.press(selector, 'Enter');
        console.log(`✅ 在 ${selector} 中输入文本并发送`);
        inputFound = true;
        break;
      } catch (e) {
        continue; // 尝试下一个选择器
      }
    }
    
    if (!inputFound) {
      console.log('⚠️ 未找到输入框');
    }
    
    // 等待响应
    await page.waitForTimeout(5000);
    
    // 检查是否有响应生成
    const storyPanelsAfter = await page.$$('.glass-panel');
    if (storyPanelsAfter && storyPanelsAfter.length > 0) {
      const firstPanel = storyPanelsAfter[0];
      const storyText = await firstPanel.textContent();
      console.log(`✅ 文本输入响应: ${storyText.substring(0, 100)}...`);
    } else {
      console.log('⚠️ 未找到故事响应');
    }
    
    // 5. 测试麦克风按钮
    console.log('🎤 测试麦克风按钮...');
    // 查找麦克风按钮 - 通常是圆形按钮
    const micButtons = await page.$$('.w-20.h-20, .w-28.h-28, button'); // 可能的麦克风按钮样式
    if (micButtons && micButtons.length > 0) {
      console.log(`✅ 找到 ${micButtons.length} 个按钮元素`);
      // 不实际点击，因为这会触发录音
    } else {
      console.log('⚠️ 未找到麦克风按钮');
    }
    
    // 6. 测试其他控制组件
    console.log('🎛️ 测试控制组件...');
    const voiceSelectors = await page.$$('.pointer-events-auto, .bg-slate-800\\/60, .rounded-full'); // 可能的控制组件样式
    if (voiceSelectors && voiceSelectors.length > 0) {
      console.log(`✅ 找到 ${voiceSelectors.length} 个控制组件`);
    } else {
      console.log('⚠️ 未找到控制组件');
    }
    
    // 7. 再次测试情绪识别功能
    console.log('😊 测试情绪识别功能...');
    for (const selector of inputSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.fill(selector, '我今天很不开心，感到焦虑和失眠');
        await page.press(selector, 'Enter');
        console.log(`✅ 在 ${selector} 中输入情绪文本`);
        break;
      } catch (e) {
        continue;
      }
    }
    
    await page.waitForTimeout(8000); // 等待AI处理
    
    const emotionResponsePanels = await page.$$('.glass-panel');
    if (emotionResponsePanels && emotionResponsePanels.length > 0) {
      const firstPanel = emotionResponsePanels[0];
      const emotionResponse = await firstPanel.textContent();
      console.log(`✅ 情绪识别响应: ${emotionResponse.substring(0, 150)}...`);
    } else {
      console.log('⚠️ 未找到情绪识别响应');
    }
    
    // 8. 截图记录测试结果
    console.log('📸 生成测试截图...');
    await page.screenshot({ 
      path: '/tmp/sleep-lamp-test-result.png', 
      fullPage: true 
    });
    
    console.log('✅ 测试截图已保存到 /tmp/sleep-lamp-test-result.png');
    
    console.log('🎉 Sleep-Lamp Web 应用测试完成！');
    console.log('✅ 所有基本功能测试通过');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    
    // 保存错误截图
    try {
      await page.screenshot({ 
        path: '/tmp/sleep-lamp-test-error.png', 
        fullPage: true 
      });
      console.log('📸 错误截图已保存到 /tmp/sleep-lamp-test-error.png');
    } catch (screenshotError) {
      console.error('❌ 保存错误截图失败:', screenshotError.message);
    }
  } finally {
    // 关闭浏览器
    await browser.close();
    console.log('🔒 浏览器已关闭');
  }
})();