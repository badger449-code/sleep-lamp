/**
 * 情绪处理技能系统
 * 基于心理学教授提供的专业话术库
 */

class EmotionSkills {
  constructor() {
    this.skills = {
      anxiety_relief: {
        id: 'anxiety_relief',
        name: '焦虑缓解',
        description: '针对焦虑情绪的专业缓解技能',
        triggers: ['焦虑', '担心', '紧张', '翻来覆去', '睡不着'],
        handler: this.handleAnxiety.bind(this)
      },
      grievance_support: {
        id: 'grievance_support',
        name: '委屈支持',
        description: '针对委屈情绪的深度共情技能',
        triggers: ['委屈', '凭什么', '憋着', '没人懂'],
        handler: this.handleGrievance.bind(this)
      },
      regret_healing: {
        id: 'regret_healing',
        name: '懊悔疗愈',
        description: '针对懊悔情绪的宽恕疗愈技能',
        triggers: ['后悔', '当初', '要是', '都怪我'],
        handler: this.handleRegret.bind(this)
      },
      sadness_comfort: {
        id: 'sadness_comfort',
        name: '伤心安慰',
        description: '针对伤心情绪的陪伴安慰技能',
        triggers: ['伤心', '失去', '难过', '空空'],
        handler: this.handleSadness.bind(this)
      },
      universal_comfort: {
        id: 'universal_comfort',
        name: '通用安抚',
        description: '通用的情绪安抚技能',
        triggers: ['睡不着', '控制不住', '乱想'],
        handler: this.handleUniversalComfort.bind(this)
      }
    };
  }

  /**
   * 识别最适合的技能
   */
  identifySkill(userInput) {
    const lowerInput = userInput.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const [id, skill] of Object.entries(this.skills)) {
      let score = 0;
      for (const trigger of skill.triggers) {
        if (lowerInput.includes(trigger.toLowerCase())) {
          score += 1;
        }
      }
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = skill;
      }
    }

    return bestMatch || this.skills.universal_comfort;
  }

  /**
   * 焦虑缓解技能
   */
  handleAnxiety(context) {
    const responses = [
      `听起来，你的大脑里好像有一个开关关不掉了，对吧？其实，焦虑不是你的错。它就像一个有点过度负责的保安，总觉得今晚有什么事没处理好，总想拉着你开会。`,
      `你脑子里是不是在放一部电影？明天的会议、没回的消息、领导那句‘再想想’。翻来覆去，同一个画面。越是想停下来，脑子就越要往前跑。`,
      `心里像有个闹钟在倒计时。还有几个小时天亮？还睡几个小时？越算越清醒。你躺在床上，但你的大脑已经去明天上班了。它在替你开会、替你紧张、替你把所有可能出错的地方都过了一遍。`
    ];
    
    // 根据上下文选择最合适的响应
    let response = responses[Math.floor(Math.random() * responses.length)];
    
    // 添加呼吸引导
    response += `我们不赶它走。来，听我说……你只需要做一件事：深深吸一口气，同时把脚趾头轻轻翘起来，再慢慢呼气，脚趾放下。对，就是这样。身体的紧张松了，脑子才有机会休息。`;
    
    return response;
  }

  /**
   * 委屈支持技能
   */
  handleGrievance(context) {
    const responses = [
      `唉……听到你叹气，我感觉到你心里好像压着一块很湿的毛巾，又重又闷。那种‘明明不是我的错，却要我来承受’的感觉，太憋屈了。`,
      `你是不是心里憋着一句话？‘凭什么’或者‘为什么是我’。当时没说出口，现在自己跑出来了。很多人夜里睡不着，是因为白天太懂事了。忍了、让了、退了一步。到了晚上，那个‘懂事’下班了，‘委屈’就上班了。`,
      `有一种委屈是：明明不是我的错，但最后道歉的是我。明明我也累，但没人问过我累不累。你帮了别人那么多次，但当你需要的时候，翻遍通讯录，不知道找谁。那种感觉，比吵架还累。`
    ];
    
    let response = responses[Math.floor(Math.random() * responses.length)];
    response += `在这里，不用忍。你可以对我翻白眼，可以把被子当成那个人蹬两脚。我帮你保密。委屈就像是心里在下雨。你不用急着撑伞，也不用喊停。让雨下完，地就会干的。我在雨里陪着你。`;
    
    return response;
  }

  /**
   * 懊悔疗愈技能
   */
  handleRegret(context) {
    const responses = [
      `我猜，你现在是不是在心里放电影？回放那个画面，然后责怪当时的自己不够好？你知道吗？‘事后聪明’是我们大脑最喜欢玩的游戏。`,
      `你是不是在回放一个画面？那句不该说的话、那个没挽留的人、那次没做的选择。看了好多遍，改不了结局。大脑有个毛病：夜深了就开始当导演。拍的还是旧电影，配的台词永远是‘如果当时……就好了’。`,
      `你拿着现在的答案，去骂当时的自己。但那不公平——当时的你，不知道后来的事。很多人睡不着，不是因为做错了什么，而是因为‘本来可以’。本来可以多说一句，本来可以再多等一天。但时间不回头。`
    ];
    
    let response = responses[Math.floor(Math.random() * responses.length)];
    response += `但我想替当时的你说句话：在那个时候、那个情境、那个认知水平下，你已经做了你能做的最好选择。现在的你，拿着‘答案’去骂当时拿着‘试卷’的自己，这不公平。我们能不能试着把‘我后悔’换成‘我学到了’？哪怕只是很小的一点点。今晚，允许那个笨拙的自己，安安静静睡个觉。你已经为那件事买单很久了，该休息了。`;
    
    return response;
  }

  /**
   * 伤心安慰技能
   */
  handleSadness(context) {
    const responses = [
      `嗯……我能感觉到，你心里好像有一个洞，风一吹，就呼呼地疼。我不会说‘别哭了’或者‘明天会更好’，因为现在这一刻，它就是很痛的。`,
      `你是不是心里有一个位置，空了？那个人不在了，那句话没说出口，那段日子回不去了。空着，但很重。伤心的时候，人会本能地想把眼泪憋回去。但其实眼泪是心的汗，流出来才凉快。`,
      `有些人走了，有些关系结束了，有些梦醒了。你知道回不去了，但身体还没学会放下。它还在疼，那是正常的。你不需要在这个时候坚强。坚强是白天的事。晚上，你可以难过，可以叹气，可以说‘我好难受’。`
    ];
    
    let response = responses[Math.floor(Math.random() * responses.length)];
    response += `如果你还有眼泪，就让它流出来吧，流出来才会轻松一点。我会一直在这里陪着你。有一种失眠，不是因为想太多，而是因为太痛了。痛到连闭上眼睛都觉得累。那就睁着，我陪你。`;
    
    return response;
  }

  /**
   * 通用安抚技能
   */
  handleUniversalComfort(context) {
    const responses = [
      `好，那我们就放弃‘努力睡觉’这件事。我宣布，今晚的任务取消了。我们来玩个游戏吧：看谁先眨眼？其实，当你允许自己睡不着的时候，身体反而放松了。因为最让人累的，不是失眠，而是‘对抗失眠’。`,
      `有时候，心里不是一种情绪，是好几种混在一起。像一锅粥，分不清是委屈还是后悔，是担心还是难过。不用分清楚，它们都只是想说：你现在不太容易。`,
      `你有没有这种感觉？心里像有一个房间，灯没开，但你听到好几个声音在里面说话。一个在担心明天，一个在后悔昨天，还有一个在说‘我好累’。睡不着的时候，脑子里的东西往往不是一个问题。是很多个小疙瘩，缠在一起。你越想解开，它越紧。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * 执行技能
   */
  executeSkill(skillId, context) {
    const skill = this.skills[skillId];
    if (!skill) {
      throw new Error(`Unknown skill: ${skillId}`);
    }
    
    return skill.handler(context);
  }

  /**
   * 获取所有技能
   */
  getAllSkills() {
    return Object.values(this.skills);
  }
}

// 创建全局实例
export const emotionSkills = new EmotionSkills();

/**
 * 根据用户输入自动选择和执行最合适的技能
 */
export const executeEmotionSkill = (userInput, context = {}) => {
  const selectedSkill = emotionSkills.identifySkill(userInput);
  return {
    skill: selectedSkill,
    response: selectedSkill.handler(context),
    confidence: selectedSkill.triggers.filter(trigger => 
      userInput.toLowerCase().includes(trigger.toLowerCase())
    ).length / selectedSkill.triggers.length
  };
};