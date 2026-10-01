import type { ImageMetadata } from 'astro';
import core from '../assets/core.webp';
import orbit from '../assets/orbit.webp';
import forma from '../assets/forma.webp';

export const sectionIds = [
  'hero',
  'technology',
  'work',
  'process',
  'faq',
  'contact',
  'privacy',
] as const;
export type SectionId = (typeof sectionIds)[number];
export type TechnologyId = 'expression' | 'interaction' | 'engineering';

export interface LandingContent {
  brand: string;
  meta: { title: string; description: string };
  navigation: { label: string; href: `#${SectionId}` }[];
  hero: {
    eyebrow: string;
    title: [string, string];
    description: string;
    primary: { label: string; href: '#contact' };
    secondary: { label: string; href: '#work' };
    poster: ImageMetadata;
  };
  technology: {
    eyebrow: string;
    title: string;
    description: string;
    items: {
      id: TechnologyId;
      name: string;
      english: string;
      description: string;
      tags: string[];
    }[];
  };
  work: {
    eyebrow: string;
    title: string;
    description: string;
    items: {
      id: string;
      name: string;
      category: string;
      kind: 'concept' | 'client';
      image: ImageMetadata;
      alt: string;
      description: string;
      challenge: string;
      approach: string;
      outcome: string;
      role: string;
      tags: string[];
    }[];
  };
  process: {
    eyebrow: string;
    title: string;
    description: string;
    about: string;
    steps: { title: string; english: string; description: string }[];
  };
  faq: {
    title: string;
    items: { id: string; question: string; answer: string }[];
  };
  contact: {
    eyebrow: string;
    title: [string, string];
    description: string;
    subject: string;
    preview: string;
  };
  privacy: { title: string; paragraphs: string[]; updated: string };
  labels: {
    consult: string;
    menu: string;
    skip: string;
    preview: string;
    projectDetails: string;
    challenge: string;
    approach: string;
    outcome: string;
    role: string;
    concept: string;
    selectPart: string;
    pause: string;
    resume: string;
    static: string;
    retry: string;
    reload: string;
    loading: string;
    interactive: string;
    paused: string;
    reduced: string;
    dataSaving: string;
    error: string;
    budget: string;
    disabled: string;
    initial: string;
    email: string;
    copy: string;
    copied: string;
    copyError: string;
    privacy: string;
    back: string;
  };
}

export const landing = {
  brand: 'AETHER',
  meta: {
    title: 'AETHER — 複雑を、美しい体験へ。',
    description:
      'デザインとエンジニアリングの境界を越えて。リアルタイム3D、心地よいインタラクション、育てられる設計をひとつにする、クリエイティブスタジオのコンセプトLP。',
  },
  navigation: [
    { label: '技術について', href: '#technology' },
    { label: '制作例', href: '#work' },
    { label: '進め方', href: '#process' },
  ],
  hero: {
    eyebrow: 'INDEPENDENT DIGITAL EXPERIENCE STUDIO',
    title: ['複雑を、', '美しい体験へ。'],
    description:
      'デザインとエンジニアリングの境界を越えて。\nまだ見たことのないアイデアを、心が動く体験に。',
    primary: { label: 'プロジェクトを相談する', href: '#contact' },
    secondary: { label: '制作例を見る', href: '#work' },
    poster: core,
  },
  technology: {
    eyebrow: '01 / OUR APPROACH',
    title: '驚きには、\n理由がある。',
    description:
      '目を奪う表現も、迷わない操作も。\n見える部分と、見えない設計をひとつに。',
    items: [
      {
        id: 'expression',
        name: '想像の先を、描く。',
        english: 'EXPRESSION',
        description:
          '光、質感、奥行き。リアルタイム3Dで、画面の向こうに手を伸ばしたくなる存在感を。ブランドの個性を、固有のビジュアルへ翻訳します。',
        tags: ['REALTIME 3D', 'ART DIRECTION'],
      },
      {
        id: 'interaction',
        name: '触れるたび、心地よく。',
        english: 'INTERACTION',
        description:
          'スクロールやポインターに、意味のある反応を。派手さのためではなく、理解を助け、自然と次へ進みたくなる動きを設計します。',
        tags: ['CREATIVE CODING', 'MOTION DESIGN'],
      },
      {
        id: 'engineering',
        name: '美しさを、続けられる。',
        english: 'ENGINEERING',
        description:
          '速さ、アクセシビリティ、更新のしやすさまで。公開した瞬間だけではなく、その先も育てられる、しなやかなWebの土台をつくります。',
        tags: ['PERFORMANCE', 'ACCESSIBILITY'],
      },
    ],
  },
  work: {
    eyebrow: '02 / SELECTED EXPLORATIONS',
    title: '可能性を、かたちに。',
    description:
      '表現と技術の接点を探る、ふたつのコンセプト。\nここに掲載しているのは、顧客実績ではなく自主制作の提案です。',
    items: [
      {
        id: 'orbit',
        name: 'ORBIT',
        category: 'SPATIAL INTERFACE',
        kind: 'concept',
        image: orbit,
        alt: '立体的なネットワークを中心に据えた、ORBITの空間インターフェースのコンセプト画像。',
        description:
          '複雑なつながりを、直感で読み解く。データの向こうにある構造を、空間から考えるインターフェース。',
        challenge: '多層的な情報を、一覧の数字だけに頼らず理解できる形にする。',
        approach:
          '情報の関係を立体に置き換え、全体像と詳細を行き来する画面を構想。',
        outcome:
          '空間表現と通常の情報パネルを組み合わせたビジュアル提案。製品化や実利用での効果測定は未実施です。',
        role: 'コンセプト設計 / アートディレクション / オリジナル図版',
        tags: ['UI / UX', 'DATA VISUALIZATION', 'CONCEPT'],
      },
      {
        id: 'forma',
        name: 'FORMA',
        category: 'DIGITAL BRAND EXPERIENCE',
        kind: 'concept',
        image: forma,
        alt: '淡い石色の空間で、金属のリングとテラコッタ色の球体が重なるFORMAのコンセプト画像。',
        description:
          'かたちと光が、ブランドを語る。プロダクトの佇まいを、デジタルならではの視点で再発見する。',
        challenge:
          '写真を並べるだけでは伝えにくい、素材感や形状の魅力を届ける。',
        approach:
          '彫刻的なオブジェクトと余白を組み合わせ、光と角度によって印象が変わるブランド体験を構想。',
        outcome:
          '素材と形の対話をテーマにしたビジュアル提案。実在ブランドとの取引や販売実績を示すものではありません。',
        role: 'コンセプト設計 / ビジュアルデザイン / オリジナル図版',
        tags: ['ART DIRECTION', '3D EXPLORATION', 'CONCEPT'],
      },
    ],
  },
  process: {
    eyebrow: '03 / HOW WE COLLABORATE',
    title: '一緒に考え、\n一歩先へ。',
    description:
      '完成形が見えていなくても大丈夫。\n小さく試し、対話を重ね、確かな体験へ育てます。',
    about:
      'AETHERは、デザインと開発を分けずに考えるスタジオのコンセプトです。見た目と仕組みを同時に磨く、その姿勢をこのサイトで表現しています。',
    steps: [
      {
        title: '知る・見つける',
        english: 'DISCOVER',
        description:
          '目的、届けたい相手、解決したいこと。対話から、プロジェクトの芯を見つけます。',
      },
      {
        title: 'つくって、試す',
        english: 'PROTOTYPE',
        description:
          '重要な体験から小さくかたちに。動く試作で、言葉だけでは伝わらない可能性を確かめます。',
      },
      {
        title: '細部まで、磨く',
        english: 'BUILD',
        description:
          'デザインと実装を行き来しながら、操作性、速さ、アクセシビリティまで仕上げます。',
      },
      {
        title: '公開から、育てる',
        english: 'EVOLVE',
        description:
          '更新できる仕組みと運用手順を引き継ぎ、利用状況をもとに改善の方向を考えます。',
      },
    ],
  },
  faq: {
    title: 'はじめる前に。',
    items: [
      {
        id: 'early-stage',
        question: 'アイデアの段階から相談できますか？',
        answer:
          'このコンセプトでは、構想段階から一緒に考える進め方を想定しています。目的や課題の整理から始め、必要に応じて小さな試作を行います。実際の受付範囲は、本公開時に運営者が確定します。',
      },
      {
        id: 'schedule',
        question: '制作期間や費用は、どのように決まりますか？',
        answer:
          '表現の難易度、掲載内容、素材制作、対応範囲によって変わります。まず実現したいことを整理し、段階ごとの成果物と検証内容を明確にしたうえで計画します。本ページに確約された料金や納期はありません。',
      },
      {
        id: 'update',
        question: '公開後に、文章や画像を更新できますか？',
        answer:
          'はい。このLPは内容データと表示・3Dのコードを分離しています。開発環境を扱える担当者が文章や画像を差し替え、確認して再配信する構成です。CMSの管理画面は導入していません。',
      },
      {
        id: 'access',
        question: 'スマートフォンや、3Dが動かない環境でも見られますか？',
        answer:
          '重要な情報はすべて通常のHTMLで提供しています。動きを抑える設定や3D非対応環境では静止画に切り替えます。JavaScriptを無効にしても、本文や制作例、FAQを読むことができます。',
      },
    ],
  },
  contact: {
    eyebrow: '04 / LET’S MAKE SOMETHING MATTER',
    title: ['次の「まだない」を、', '一緒につくろう。'],
    description:
      '小さな問いから、新しい体験がはじまります。\n構想、課題、まだ言葉にならないアイデアを聞かせてください。',
    subject: 'AETHERへのプロジェクト相談',
    preview:
      '現在はコンセプトプレビューです。相談窓口は公開準備中のため、このページではお問い合わせを受け付けていません。',
  },
  privacy: {
    title: '個人情報の取り扱い',
    paragraphs: [
      'このLPには入力フォーム、広告トラッカー、外部解析サービス、Cookieを使う計測を設置していません。3Dの状態は現在の閲覧中だけ保持します。',
      '相談メールを設定した公開版では、メールリンクはお使いのメールアプリを開きます。LPからメールを送信・保存することはありません。送信する内容は相談への対応にのみ使用する方針です。',
      '配信事業者が記録するアクセスログや受信メールの保管期間、開示等の連絡先は、運営者と配信先の決定後に正式な方針として更新します。現状は本公開用に承認された法的文言ではありません。',
    ],
    updated: '2026-09-30',
  },
  labels: {
    consult: '相談する',
    menu: 'メニュー',
    skip: '本文へ移動',
    preview: 'CONCEPT PREVIEW',
    projectDetails: 'コンセプトの詳細',
    challenge: '課題',
    approach: 'アプローチ',
    outcome: '制作内容',
    role: '担当範囲',
    concept: '自主制作 / コンセプト',
    selectPart: '3Dで強調',
    pause: '動きを停止',
    resume: '動きを再開',
    static: '軽量表示',
    retry: '3Dを再試行',
    reload: 'ページを再読み込みして再試行',
    loading: '3Dを読み込み中。本文はそのままご覧いただけます。',
    interactive: '3D表示中',
    paused: '動きを停止中',
    reduced: '動きを抑える設定：静止画で表示しています。',
    dataSaving: 'データ節約設定：静止画で表示しています。',
    error: '3Dを表示できないため、静止画に切り替えました。',
    budget: '描画負荷を抑えるため、静止画に切り替えました。',
    disabled: '静止画で表示しています。',
    initial: 'AETHER CORE / 静止画',
    email: 'メールで相談する',
    copy: 'アドレスをコピー',
    copied: 'メールアドレスをコピーしました。',
    copyError:
      'コピーできませんでした。表示されたアドレスを選択してコピーしてください。',
    privacy: 'プライバシー',
    back: 'ページの先頭へ',
  },
} satisfies LandingContent;
