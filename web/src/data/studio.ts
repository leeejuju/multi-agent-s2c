export interface Character {
  id: string;
  name: string;
  role: string;
  motivation: string;
  conflict: string;
  description: string;
}

export interface ScriptItem {
  id: string;
  title: string;
  description: string;
  content: string;
  characters: Character[];
  lastEdited: string;
  createdAt: string;
  isTrash?: boolean;
}

export interface VideoScene {
  id: string;
  title: string;
  scriptText: string;
  imageUrl: string;
}

export interface VideoProject {
  id: string;
  title: string;
  description: string;
  aspectRatio: "16:9" | "9:16" | "4:3" | "1:1";
  scenes: VideoScene[];
  lastEdited: string;
  createdAt: string;
  isTrash?: boolean;
}

export interface CommunityItem {
  id: string;
  title: string;
  author: string;
  description: string;
  content: string;
  likes: number;
  commentsCount: number;
  tags: string[];
  hasLiked?: boolean;
}

export interface UpdateNote {
  id: string;
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const initialScripts: ScriptItem[] = [
  {
    id: "script-1",
    title: "烛影斧声",
    description: "开始你的创作之旅...",
    content: `场景：宋开宝九年，万岁殿内。夜，暴雪狂作。

万岁殿。殿内昏暗，惟几支巨烛发出惨淡的光。殿外，暴风雪拍打着重重殿门。

赵匡胤（太祖，五十岁，龙袍散乱，面色灰败，剧烈咳嗽）靠在御榻上。

御案上，一壶酒已空，琥珀杯倾倒在案。

赵光义（晋王，四十岁，神情阴鸷，按剑而立）站在阶下，在灯影中半明半暗。

赵匡胤
（指着御案上的杯子，声音嘶哑）
光义……再……再给朕斟一杯。

赵光义缓步走上玉阶，提起空酒壶，眼神深不可测。

赵光义
皇兄，太医说了，你已不能再饮。

赵匡胤
（冷笑，猛咳）
朕能横扫天下，难道还不能多饮一杯御酒？！斟上！

赵光义叹了口气，却并未斟酒，而是倒退两步，身影融在烛影背后。

赵匡胤挣扎着要爬起来，但双腿无力，几乎跌落榻下。他顺手抓起一旁的玉斧，狠狠击在御榻的护栏上！

铛！声音震耳欲聋。

赵匡胤
（怒吼，用玉斧指着阴暗处）
好为之！好为之！你记住今日的话！

殿外。两名内侍站在暴风雪中。

通过紧闭的窗纸，他们只能看到太祖皇帝那挥舞着玉斧的庞大影子。

随后，那巨大的身影重重倒下。

紧接着，是酒壶滚落在地、玉斧掉入地毯的沉闷声响。

接着，万岁殿内一片死寂。`,
    characters: [
      {
        id: "char-1",
        name: "赵匡胤",
        role: "宋朝太祖皇帝",
        motivation: "守护大宋江山，将皇位传给亲生儿子。",
        conflict: "病入膏肓，意识到身边的弟弟赵光义羽翼已丰，危及自己的权力和儿子的未来。",
        description: "五十岁。威严狂放，虽病入膏肓，仍带有开国皇帝的惊人霸气。手中握着象征权力的玉斧。",
      },
      {
        id: "char-2",
        name: "赵光义",
        role: "晋王，太祖之弟",
        motivation: "登上皇位，一展宏图，将天下收于掌心。",
        conflict: "需要太祖皇帝自然或非自然地禅让，同时面临太祖身边亲信的猜忌。",
        description: "四十岁。沉稳隐忍，心思缜密，喜怒不形于色。烛光下眼神阴鸷，充满野心。",
      },
    ],
    lastEdited: "前天",
    createdAt: "2026-06-25T10:00:00Z",
  },
  {
    id: "script-2",
    title: "散场后的剧场 (Community)",
    description: "一个鼓楼电商女孩在剧场邂逅她眼中的理想主义演员",
    content: `场景：鼓楼小剧场。深夜。

小剧场的舞台上，最后一盏聚光灯正徐徐熄灭。

空气中弥漫着尚未散尽的干冰烟雾，和观众留下的微弱温度。

林妙（二十四岁，背着巨大的双肩包，手里拿着发光的手机和快递样板。眼神疲惫，但此时清亮）站在最后一排台阶上。

她刚结束了在鼓楼胡同里的电商选品和对账，偶然溜进这家剧场。

舞台中央。

陈野（二十六岁，身上穿着洗得发白的中世纪戏剧斗篷，头发凌乱，满脸细汗）正蹲在舞台边缘，一片一片地捡起观众落下的纸飞机。

林妙的手一滑，手机跌在塑料折叠椅上，发出一声轻响。

陈野猛地抬头。他的眼睛在黑暗中亮得惊人。

陈野
（有些惊讶）
还有人？演出已经结束了。

林妙
（局促地指指大门）
我……我看着门没锁，就溜进来了。对不起，我这就走。

陈野
（站起身，笑着招招手）
没事。反正最精彩的部分他们都没看到。

林妙停下脚步，好奇地望向舞台。

林妙
最精彩的部分？

陈野一扬手，把手里的一叠彩色纸飞机撒向空中！

陈野
（用华丽的舞台腔）
最后一片落叶，也将作为王冠上的明珠！

纸飞机在剧场残存的弱光下划过优美的弧线，落在台下的空椅上。林妙看着，忍不住笑出了声，疲惫的脸上有了生机。`,
    characters: [
      {
        id: "char-3",
        name: "林妙",
        role: "电商选品女孩",
        motivation: "在这个繁华冷漠的都市里寻找一丝属于自己的真实和温度。",
        conflict: "被无尽的KPI、快递、对账单包围，内心的艺术和理想被生活压力挤压殆尽。",
        description: "二十四岁。戴黑框眼镜，身穿休闲卫衣，眼圈微黑。神情局促，但听到戏剧台词时眼睛会发光。",
      },
      {
        id: "char-4",
        name: "陈野",
        role: "地下剧团演员",
        motivation: "坚守戏剧理想，不在乎台下是一个人还是一万个人。",
        conflict: "交不起下个月的房租，剧团面临解散，但拒绝去拍粗制滥造的带货短剧。",
        description: "二十六岁。瘦高。有着清澈而执着的目光，笑起来很温暖，身上带着股中二而浪漫的纯粹劲。",
      },
    ],
    lastEdited: "前天",
    createdAt: "2026-06-25T12:00:00Z",
  },
];

export const initialVideoProjects: VideoProject[] = [
  {
    id: "video-1",
    title: "散场后的剧场 - 概念预告片",
    description: "以制作AI影像为目的",
    aspectRatio: "16:9",
    scenes: [
      {
        id: "scene-1",
        title: "场景一：微雨的鼓楼胡同",
        scriptText: "夜。细雨蒙蒙。鼓楼在路灯中显得古老肃穆，林妙穿着雨衣，抱着一堆带货样板在胡同里狂奔，两旁是斑驳的青砖墙。",
        imageUrl: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "scene-2",
        title: "场景二：孤独的剧场大门",
        scriptText: "林妙驻足在一家陈旧的小剧场门口。暖黄色的霓虹灯牌在雨中闪烁，门虚掩着，透出一道神秘的白光。",
        imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "scene-3",
        title: "场景三：飞舞的彩色纸飞机",
        scriptText: "陈野在昏暗的空无一人的舞台上，大笑着飞起一架架荧光纸飞机。纸飞机掠过林妙的耳际，把整个破旧剧场装点得如梦如幻。",
        imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800",
      },
    ],
    lastEdited: "前天",
    createdAt: "2026-06-25T14:00:00Z",
  },
];

export const initialCommunityItems: CommunityItem[] = [
  {
    id: "comm-1",
    title: "《烛影斧声》- 悬疑历史正剧首集",
    author: "leejuju",
    description: "大宋开国最大谜案，通过两个内侍视角，用密室悬疑的方式重新拆解万岁殿暴雪之夜的权力交接。",
    content: "（内容见示例：烛影斧声）",
    likes: 42,
    commentsCount: 15,
    tags: ["历史", "悬疑", "密室"],
    hasLiked: false,
  },
  {
    id: "comm-2",
    title: "《月球背面没有兔子》- 科幻黑色幽默",
    author: "ChunXiangZhao",
    description: "2088年，中国登月基地的一名后勤保障员意外在月球背面发现了一个被废弃的20世纪八十年代红砖居民区，里面还住着一个喝二锅头的门卫老大爷。",
    content: `场景：月球背面，环形山内部。

林风（三十岁，登月服臃肿，面罩后满是冷汗）在黑夜中跌跌撞撞地爬过一块巨石。

他的宇航服氧气警报正在疯狂闪烁。

当他爬过山口，手电筒光柱扫向前方的平原。

一座经典的中国北方八十年代家属院红砖大楼静静地伫立在真空的月球表面，阳台上甚至晾晒着几件蓝色的工装和一条红被单。

大楼门口挂着个木牌：‘红星第一轴承厂登月筹备处’。

林风
（揉了揉眼睛，大口喘气）
宇航局……我的幻觉已经到这种地步了吗？

一个身穿绿色棉大衣、戴着雷锋帽、手里夹着一根冒烟的香烟（竟然在真空里燃烧！）的老头，搬着个马扎坐在门口，神情惬意地吹了口茶叶。

老头
（操着一口正宗的保定口音）
干嘛的？登记了吗？有介绍信没有？

林风张大了嘴，整个人直接石化在原地。`,
    likes: 128,
    commentsCount: 37,
    tags: ["科幻", "喜剧", "脑洞"],
    hasLiked: true,
  },
  {
    id: "comm-3",
    title: "《霓虹暴雪》- 赛博朋克东北新怪谈",
    author: "影创者AI",
    description: "在永远下雪的哈尔滨赛博都市，退役义体锅炉工老李为了寻找失踪的生化孙女，重执蒸汽大扳手，闯入由AI东正教神父统治的冰雕大教堂。",
    content: `场景：冰雕大教堂。中央大厅。

蓝色的全息霓虹折射在冰雕的穹顶上。圣像画都是由跳动的绿荧光代码组成的圣母像。

老李（六十岁，右臂是一条锈迹斑斑的生铁液压机械臂，嘴里叼着个旱烟袋，神情冷漠）跨过教堂那高耸的重型冰雕拱门。

他的脚底踩在结冰的地板上，钢钉防滑鞋发出咔咔的刺耳声。

大厅尽头。

神父（生化半机械人，全金属骨骼上披着东正教金丝祭披，头部是个悬浮的冰晶全息矩阵投影）缓缓转过身。

神父
李建国，你不该来。神圣代码已经赦免了你孙女的有机意志，她现在是纯净的光信号。

老李
（吐出一口白雾，把生铁右臂狠狠往地上一砸）
去你奶奶的光信号。把俺闺女交出来，不然今儿俺就把你这大冰块子熔成洗脚水！

老李右手握紧，生铁手臂内的蒸汽管道发出高亢的怒吼，排气阀喷出滚滚白热蒸汽，瞬间在冰雕教堂里弥漫开来。`,
    likes: 95,
    commentsCount: 22,
    tags: ["赛博朋克", "科幻", "东北怪谈"],
    hasLiked: false,
  },
];

export const initialUpdateNotes: UpdateNote[] = [
  {
    id: "note-1",
    version: "v2.4.0",
    date: "2026-06-25",
    title: "全新 Gemini 3.5 智能剧作大模型发布",
    highlights: [
      "接入最新一代 `gemini-3.5-flash` 极速智能大模型，剧本格式化准确率提升80%",
      "新增 AI Storyboard 影像制作功能，支持 `gemini-2.5-flash-image` 实时生成高精度的16:9剧作概念图",
      "优化剧本格式导出机制，完美支持导出为标准影视TXT及PDF大纲",
      "全新积分兑换中心上线，完成每日任务和创作挑战即可免费获取积分奖励",
    ],
  },
  {
    id: "note-2",
    version: "v2.3.1",
    date: "2026-06-12",
    title: "性能优化与社区互动升级",
    highlights: [
      "支持本地草稿离线自动保存，再也不用担心浏览器崩溃导致灵感丢失",
      "社区分享板块新增点赞、评论及一键导入他人剧作功能",
      "修复了在低清屏幕下侧边栏卡片错位的视觉Bug",
    ],
  },
];
