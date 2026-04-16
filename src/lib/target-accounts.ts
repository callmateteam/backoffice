export interface TargetAccount {
  username: string;
  category: string;
  description: string;
}

export const TARGET_ACCOUNTS: TargetAccount[] = [
  // 소상공인/자영업
  { username: "yang__seungil", category: "소상공인/자영업", description: "외식업/식당 장사 창업 전문" },
  { username: "jeonju_chongakne_gejang", category: "소상공인/자영업", description: "전주 게장 가게 사장, 자영업 일상" },
  { username: "pip.cafe.daegu", category: "소상공인/자영업", description: "대구 카페 운영 일상" },
  { username: "daejeon.j_cafe", category: "소상공인/자영업", description: "대전 개인카페, 첫 자영업 도전기" },
  { username: "mochi__tree", category: "소상공인/자영업", description: "자영업/스마트스토어 소통" },
  { username: "yeonjae_hangung", category: "소상공인/자영업", description: "자영업 매출 일기, 현장 목소리" },
  { username: "nakata0918", category: "소상공인/자영업", description: "자영업 일상, 솔직한 이야기" },
  { username: "soul.lasagna", category: "소상공인/자영업", description: "가게 배달 운영, 배달대행 리얼" },
  { username: "jeju_hayoung", category: "소상공인/자영업", description: "제주 스마트스토어, 수수료 정보" },
  { username: "itsme_bd1", category: "소상공인/자영업", description: "8년차 매장 운영" },
  { username: "illillillillllll", category: "소상공인/자영업", description: "대형프차 10년 폐점 경험" },
  { username: "2jang", category: "소상공인/자영업", description: "식당 운영, 배달 시대 이야기" },

  // 창업/스타트업
  { username: "startuprecipe", category: "창업/스타트업", description: "스타트업 투자 유치 뉴스, 글로벌 트렌드" },
  { username: "douglas.guen", category: "창업/스타트업", description: "창업 실패담, 경영, 프라이머" },
  { username: "lawhoonhoon2", category: "창업/스타트업", description: "7년차 스타트업 대표, 정부지원금" },
  { username: "korea.value", category: "창업/스타트업", description: "경영지도사, 창업 평가위원" },
  { username: "nmsvc2024", category: "창업/스타트업", description: "초기 스타트업 실전 조언" },
  { username: "baek9900", category: "창업/스타트업", description: "싱가폴 VC 투자, 해외 창업" },
  { username: "got_bruce", category: "창업/스타트업", description: "예비창업패키지/정부지원사업" },
  { username: "approval.sb", category: "창업/스타트업", description: "ICT 창업 지원사업, 정부 정책" },
  { username: "turtle_step_", category: "창업/스타트업", description: "Threads 마케팅 트렌드" },

  // 매출/마케팅
  { username: "action_exploration", category: "매출/마케팅", description: "프랜차이즈 월수익 분석 (숫자 해부)" },
  { username: "swordtoss", category: "매출/마케팅", description: "자영업 매출 루틴, 실전 팁" },
  { username: "charming.nana92", category: "매출/마케팅", description: "브랜딩/기획/디자인 마케팅" },
  { username: "cys_makin", category: "매출/마케팅", description: "배달앱 비즈니스 분석" },
  { username: "nowuseinsta", category: "매출/마케팅", description: "배달앱 수수료 규제 이슈" },
  { username: "stringlife_", category: "매출/마케팅", description: "객단가, CPA, 이커머스" },
  { username: "moneychefkr", category: "매출/마케팅", description: "재테크/재무설계/금융교육" },

  // 폐업/현실
  { username: "ai_nomad_story", category: "폐업/현실", description: "자영업 폐업률 통계, 현실 데이터" },
  { username: "dinoart_books", category: "폐업/현실", description: "자영업 폐업율 현실 질문형" },
  { username: "lolili_fund", category: "폐업/현실", description: "폐업 전 정부 자금 정보" },
  { username: "mr_river_side", category: "폐업/현실", description: "폐업정리 세일, 해외 시선" },
  { username: "dxbhkkr", category: "폐업/현실", description: "자영업자 현실 대화" },
];

export const CATEGORIES = [...new Set(TARGET_ACCOUNTS.map((a) => a.category))];
