"use client";

import { useEffect, useMemo, useState } from "react";
import catalogRows from "./catalog.json";

type Language = "ua" | "ru";
type Product = {
  id: string;
  name: string;
  brand: string;
  image: string;
  category: string;
  problem: string[];
  price: number;
  sizes: { label: string; price: number }[];
  status: "available" | "low" | "waiting";
  description: { ua: string; ru: string };
  chemistryGroups: string[];
};
type CartItem = { productId: string; size: string; qty: number };
type OrderItem = CartItem & { name: string; unitPrice: number };
type VideoItem = {
  id: string;
  type: "chemistry" | "equipment";
  title: { ua: string; ru: string };
};
type BundleItem = { productId: string; name: string; amount: string; qty?: number };
type Bundle = {
  id: string;
  title: { ua: string; ru: string };
  price: number;
  description: { ua: string; ru: string };
  items: BundleItem[];
};

type CuratedProduct = {
  name?: string;
  image: string;
  description: { ua: string; ru: string };
  chemistryGroups: string[];
};

const CART_KEY = "cleantapi-cart-v1";
const CART_TTL = 24 * 60 * 60 * 1000;

const videoItems: VideoItem[] = [
  { id: "NCl8qnkkFnc", type: "chemistry", title: { ua: "Кислотні ополіскувачі для промивання", ru: "Кислотные ополаскиватели для промывки" } },
  { id: "vS5aXijIl14", type: "chemistry", title: { ua: "Засоби Global для основної хімчистки", ru: "Средства Global для основной химчистки" } },
  { id: "C-rs1IJS-QI", type: "chemistry", title: { ua: "Готовий набір для хімчистки авто", ru: "Готовый набор для химчистки авто" } },
  { id: "NWMhbbk4W38", type: "chemistry", title: { ua: "Коротка інструкція про хімію Chemspec", ru: "Краткая инструкция по химии Chemspec" } },
  { id: "Xwssbc6K6B8", type: "chemistry", title: { ua: "Порівняння готових наборів для хімчистки меблів", ru: "Сравнение готовых наборов для химчистки мебели" } },
  { id: "MK4PxYBj21Y", type: "chemistry", title: { ua: "Засоби Global для видалення плям сечі", ru: "Средства Global для удаления пятен мочи" } },
  { id: "1htMP2p91xY", type: "chemistry", title: { ua: "Пре-спреї World of Clean", ru: "Пре-спреи World of Clean" } },
  { id: "4jCd_RtuJjE", type: "equipment", title: { ua: "Як користуватися екстрактором Santoemma", ru: "Как пользоваться экстрактором Santoemma" } },
  { id: "-9JCjzxfqEA", type: "equipment", title: { ua: "Порівняння миючих пилососів Santoemma, Karcher і Profi", ru: "Сравнение моющих пылесосов Santoemma, Karcher и Profi" } },
];

const bundles: Bundle[] = [
  {
    id: "bundle-start", title: { ua: "Готовий набір «Старт»", ru: "Готовый набор «Старт»" }, price: 330,
    description: { ua: "Мінімальний стартовий набір хімії для хімчистки меблів, сидінь авто та килимів. Цих засобів вистачить на хімчистку 8–10 диванів. Ціна вже з доставкою по Польщі.", ru: "Минимальный стартовый набор химии для химчистки мебели, сидений авто и ковров. Средств хватит на химчистку 8–10 диванов. Цена уже с доставкой по Польше." },
    items: [
      {productId:"21",name:"Global Enzym",amount:"300 г"},{productId:"19",name:"Global Extraction",amount:"300 г"},{productId:"17",name:"Global Acid Ocean",amount:"1 л"},{productId:"16",name:"Global Urine",amount:"1 л"},{productId:"25",name:"Global OxyGo",amount:"500 мл"},{productId:"24",name:"Global Sta Kill",amount:"500 мл"},{productId:"26",name:"Global Stain Pro",amount:"250 мл"},{productId:"10",name:"World of Clean Spot Solve",amount:"250 мл"},
    ],
  },
  {
    id: "bundle-standard", title: { ua: "Готовий набір «Стандарт»", ru: "Готовый набор «Стандарт»" }, price: 580,
    description: { ua: "Стандартний набір засобів для хімчистки меблів, сидінь авто та килимів. Цих засобів буде достатньо для хімчистки 35–45 диванів. Ціна вже з доставкою по Польщі.", ru: "Стандартный набор средств для химчистки мебели, сидений авто и ковров. Средств будет достаточно для химчистки 35–45 диванов. Цена уже с доставкой по Польше." },
    items: [
      {productId:"21",name:"Global Enzym",amount:"300 г"},{productId:"21",name:"Global Enzym",amount:"1 кг"},{productId:"19",name:"Global Extraction",amount:"1 кг"},{productId:"17",name:"Global Acid Ocean",amount:"5 л"},{productId:"16",name:"Global Urine",amount:"1 л"},{productId:"24",name:"Global Sta Kill",amount:"1 л"},{productId:"28",name:"World of Clean Eco POG",amount:"500 мл"},{productId:"27",name:"World of Clean Solution M Power",amount:"500 мл"},{productId:"25",name:"Global OxyGo",amount:"500 мл"},{productId:"30",name:"World of Clean SPM Atlantic Breeze",amount:"500 г"},{productId:"4",name:"Лакмусові папірці",amount:"1 шт"},
    ],
  },
  {
    id: "bundle-expert", title: { ua: "Готовий набір «Експерт»", ru: "Готовый набор «Эксперт»" }, price: 640,
    description: { ua: "Набір «Експерт» — майстер хімчистки. Цих засобів буде достатньо для хімчистки 35–45 диванів. Ціна вже з доставкою по Польщі.", ru: "Набор «Эксперт» — мастер химчистки. Средств будет достаточно для химчистки 35–45 диванов. Цена уже с доставкой по Польше." },
    items: [
      {productId:"29",name:"World of Clean Shockwave",amount:"1 кг"},{productId:"30",name:"World of Clean SPM Atlantic Breeze",amount:"500 г"},{productId:"31",name:"World of Clean Blaze",amount:"500 г"},{productId:"28",name:"World of Clean Eco POG",amount:"500 мл"},{productId:"27",name:"World of Clean Solution M Power",amount:"500 мл"},{productId:"26",name:"Prochem Stain Pro",amount:"1 л"},{productId:"24",name:"Global Sta Kill",amount:"1 л"},{productId:"17",name:"Global Acid Ocean",amount:"5 л"},{productId:"14",name:"Pro Oxy Blast",amount:"500 мл"},{productId:"15",name:"Clinex Anti Spot",amount:"250 мл"},{productId:"19",name:"Global Extraction",amount:"1 кг"},{productId:"23",name:"Global Single Pass",amount:"500 г"},{productId:"16",name:"Global Urine",amount:"1 л"},{productId:"4",name:"Лакмусові папірці",amount:"1 шт"},
    ],
  },
  {
    id: "bundle-auto", title: { ua: "Готовий набір «Для хімчистки авто»", ru: "Готовый набор «Для химчистки авто»" }, price: 505,
    description: { ua: "Комплект засобів для професійної хімчистки авто. Все необхідне в одному наборі. Ціна вже з доставкою по Польщі.", ru: "Комплект средств для профессиональной химчистки авто. Всё необходимое в одном наборе. Цена уже с доставкой по Польше." },
    items: [
      {productId:"21",name:"Global Enzym",amount:"1 кг"},{productId:"19",name:"Global Extraction",amount:"1 кг"},{productId:"13",name:"Koch Chemie Pol Star",amount:"1 л"},{productId:"11",name:"Koch Chemie Mehrzweckreiniger (MZR)",amount:"1 л"},{productId:"3",name:"Work Stuff Піноутворювач",amount:"1 шт"},{productId:"7",name:"Work Stuff Scrub",amount:"1 шт"},{productId:"34",name:"ADBL Tickler",amount:"1 шт"},{productId:"35",name:"Щітка",amount:"1 шт"},{productId:"12",name:"Koch Chemie Leather Star",amount:"1 л"},{productId:"40",name:"Fresso Interior Dressing",amount:"500 мл"},{productId:"50",name:"Fresso Glass Cleaner",amount:"500 мл"},{productId:"63",name:"Work Stuff Розпилювач",amount:"1 л"},{productId:"5",name:"Мікрофібра 40×40",amount:"1 шт"},
    ],
  },
];

const curatedProducts: Record<string, CuratedProduct> = {
  "8": {
    name: "Power Blast R130",
    image: "/products/global-power-blast-official.webp",
    chemistryGroups: ["prespray"],
    description: {
      ua: "Високолужний порошковий пре-спрей для сильних забруднень на синтетичних килимах і комерційних покриттях. Розчиняє в’їдений бруд і жирні плями. Розведення 1:66 у воді до 65°C. pH 12,5–12,8. Перед роботою перевірте стійкість кольору; не застосовуйте на делікатних натуральних тканинах.",
      ru: "Высокощелочной порошковый пре-спрей для сильных загрязнений на синтетических коврах и коммерческих покрытиях. Растворяет въевшуюся грязь и жирные пятна. Разведение 1:66 в воде до 65°C. pH 12,5–12,8. Перед работой проверьте стойкость цвета; не применяйте на деликатных натуральных тканях.",
    },
  },
  "16": {
    name: "Urine Stain Remover U301",
    image: "/products/global-urine-official.webp",
    chemistryGroups: ["stainRemovers", "odorNeutralizers"],
    description: {
      ua: "Готовий професійний засіб для плям сечі на оббивці та килимах. Допомагає нейтралізувати залишки солей сечі: нанесіть без розведення, витримайте приблизно 30 хвилин і промийте екстрактором з основним миючим засобом. Спочатку протестуйте на непомітній ділянці.",
      ru: "Готовое профессиональное средство для пятен мочи на обивке и коврах. Помогает нейтрализовать остатки солей мочи: нанесите без разведения, выдержите около 30 минут и промойте экстрактором с основным моющим средством. Сначала протестируйте на незаметном участке.",
    },
  },
  "17": {
    name: "Acid Ocean Rinse S550",
    image: "/products/global-acid-ocean-official.jpg",
    chemistryGroups: ["acidRinses"],
    description: {
      ua: "Кислотний ополіскувач для завершального екстракційного промивання після лужної хімії. Нейтралізує залишкову лужність і допомагає стабілізувати тканину. pH 3,5. Орієнтовне дозування: 40 мл на 10 л води; перед застосуванням звіртеся з етикеткою.",
      ru: "Кислотный ополаскиватель для завершающей экстракционной промывки после щелочной химии. Нейтрализует остаточную щёлочность и помогает стабилизировать ткань. pH 3,5. Ориентировочная дозировка: 40 мл на 10 л воды; перед применением сверьтесь с этикеткой.",
    },
  },
  "19": {
    name: "Extraction Clean S880",
    image: "/products/global-extraction-official.webp",
    chemistryGroups: ["detergents"],
    description: {
      ua: "Сильно концентрований порошковий засіб для екстракційного промивання дуже забруднених синтетичних килимів та оббивки. Формула містить антипінний компонент, не залишає липкого нальоту й добре працює за різної температури води. Дозування: близько 20 г на 10 л води.",
      ru: "Сильно концентрированное порошковое средство для экстракционной промывки очень загрязнённых синтетических ковров и обивки. Формула содержит антипенный компонент, не оставляет липкого налёта и хорошо работает при разной температуре воды. Дозировка: около 20 г на 10 л воды.",
    },
  },
  "20": {
    name: "Heavy Soil Booster S707",
    image: "/products/global-heavy-soil-official.jpg",
    chemistryGroups: ["prespray", "stainRemovers"],
    description: {
      ua: "Лужний підсилювач пре-спрею та знежирювач для важких жирних забруднень. Додавайте приблизно 30 мл на 1 л робочого розчину Power Blast або Enzym. Локально можна наносити на стійкі жирні плями, витримати 5–10 хвилин, пропрацювати щіткою та ретельно промити. pH 11–12.",
      ru: "Щелочной усилитель пре-спрея и обезжириватель для тяжёлых жирных загрязнений. Добавляйте примерно 30 мл на 1 л рабочего раствора Power Blast или Enzym. Локально можно наносить на стойкие жирные пятна, выдержать 5–10 минут, проработать щёткой и тщательно промыть. pH 11–12.",
    },
  },
  "21": {
    name: "Enzym Pro98",
    image: "/products/global-enzym-official.webp",
    chemistryGroups: ["prespray", "stainRemovers"],
    description: {
      ua: "Ензимний лужний пре-спрей для попередньої обробки білкових та органічних забруднень: крові, молока, сечі, їжі й напоїв. Розчиніть приблизно 15 г у 1 л води температурою до 55°C. pH близько 11,8. Не використовуйте на делікатних натуральних волокнах без попереднього тесту.",
      ru: "Энзимный щелочной пре-спрей для предварительной обработки белковых и органических загрязнений: крови, молока, мочи, еды и напитков. Растворите примерно 15 г в 1 л воды температурой до 55°C. pH около 11,8. Не используйте на деликатных натуральных волокнах без предварительного теста.",
    },
  },
  "22": {
    name: "Finish B110",
    image: "/products/global-finish-official.webp",
    chemistryGroups: ["acidRinses"],
    description: {
      ua: "Ультраконцентрований кислотний порошок для фінального екстракційного промивання та нейтралізації високого pH після пре-спрею. Можна додавати в бак екстрактора або наносити розпиленням. Розведення 1:660 — приблизно 15 г на 10 л води. pH 3,5.",
      ru: "Ультраконцентрированный кислотный порошок для финальной экстракционной промывки и нейтрализации высокого pH после пре-спрея. Можно добавлять в бак экстрактора или наносить распылением. Разведение 1:660 — примерно 15 г на 10 л воды. pH 3,5.",
    },
  },
  "23": {
    name: "Single Pass S103",
    image: "/products/global-single-pass-official.webp",
    chemistryGroups: ["detergents", "stainRemovers"],
    description: {
      ua: "Низькопінний порошковий засіб з активним киснем для екстракційного чищення білих, світлих і пастельних килимів, матраців та оббивки. Освіжає й освітлює поверхню. Розведення 1:500 — близько 20 г на 10 л води. pH 9,5; обов’язково перевірте стійкість кольору.",
      ru: "Низкопенное порошковое средство с активным кислородом для экстракционной чистки белых, светлых и пастельных ковров, матрасов и обивки. Освежает и осветляет поверхность. Разведение 1:500 — около 20 г на 10 л воды. pH 9,5; обязательно проверьте стойкость цвета.",
    },
  },
  "24": {
    name: "Sta Kill E205",
    image: "/products/global-sta-kill-official.webp",
    chemistryGroups: ["odorNeutralizers"],
    description: {
      ua: "Засіб 2-в-1 для очищення та нейтралізації запахів сечі, блювоти, вологи, плісняви й затхлості на килимах, матрацах та оббивці. Для прямого нанесення розведіть 1:4, залиште на 15–20 хвилин і промийте; для екстракції — приблизно 100 мл на 10 л води. pH 7.",
      ru: "Средство 2-в-1 для очистки и нейтрализации запахов мочи, рвоты, влаги, плесени и затхлости на коврах, матрасах и обивке. Для прямого нанесения разведите 1:4, оставьте на 15–20 минут и промойте; для экстракции — примерно 100 мл на 10 л воды. pH 7.",
    },
  },
  "25": {
    name: "OxyGo G102",
    image: "/products/global-oxygo-official.webp",
    chemistryGroups: ["stainRemovers"],
    description: {
      ua: "Готовий кислотний плямовивідник для складних плям кави, чаю, вина, коли, ягід, чорнила, барвників, сечі та блювоти. Нанесіть на пляму, працюйте від країв до центру, витримайте 2–3 хвилини, промокніть і промийте водою або екстрактором. pH 3,5; перед роботою зробіть тест.",
      ru: "Готовый кислотный пятновыводитель для сложных пятен кофе, чая, вина, колы, ягод, чернил, красителей, мочи и рвоты. Нанесите на пятно, работайте от краёв к центру, выдержите 2–3 минуты, промокните и промойте водой или экстрактором. pH 3,5; перед работой сделайте тест.",
    },
  },
  "41": {
    name: "P.O.G. P101",
    image: "/products/global-pog-cutout.png",
    chemistryGroups: ["stainRemovers"],
    description: {
      ua: "Розчинниковий плямовивідник для фарби, олії, жиру, фломастерів, чорнила, воску, смоли, лаку для нігтів, крему для взуття та графіті. Підходить для килимів, оббивки й текстилю після тесту. Наносьте засіб на серветку та тампонуйте пляму від країв до центру. Працюйте в рукавичках і добре провітрюйте приміщення.",
      ru: "Растворительный пятновыводитель для краски, масла, жира, фломастеров, чернил, воска, смолы, лака для ногтей, крема для обуви и граффити. Подходит для ковров, обивки и текстиля после теста. Наносите средство на салфетку и тампонируйте пятно от краёв к центру. Работайте в перчатках и хорошо проветривайте помещение.",
    },
  },
  "42": {
    name: "Wool Safe Prespray B134",
    image: "/products/global-wool-safe-official.webp",
    chemistryGroups: ["prespray"],
    description: {
      ua: "Спеціалізований пре-спрей для делікатних натуральних волокон: вовни, бавовни, бамбука, джуту та льону. Підходить для килимів і оббивки, чутливих до високого pH. Розведення 1:10, pH близько 7,8. Перед повним чищенням перевірте стійкість кольору й реакцію волокна.",
      ru: "Специализированный пре-спрей для деликатных натуральных волокон: шерсти, хлопка, бамбука, джута и льна. Подходит для ковров и обивки, чувствительных к высокому pH. Разведение 1:10, pH около 7,8. Перед полной чисткой проверьте стойкость цвета и реакцию волокна.",
    },
  },
  "51": {
    name: "Citra X Out A370",
    image: "/products/global-citra-x-out-official.webp",
    chemistryGroups: ["odorNeutralizers"],
    description: {
      ua: "Концентрований ароматизатор і нейтралізатор із цитрусово-лаймовим ароматом для запахів тварин, їжі, диму та вологи. Для розпилення розведіть 1:4; як добавку під час екстракційного промивання — близько 1:100. Не маскує роботу основної хімії та використовується після тесту на сумісність.",
      ru: "Концентрированный ароматизатор и нейтрализатор с цитрусово-лаймовым ароматом для запахов животных, еды, дыма и влаги. Для распыления разведите 1:4; как добавку при экстракционной промывке — около 1:100. Не заменяет основную химию и используется после теста на совместимость.",
    },
  },
  "46": {
    name: "Cotton Upholstery Cleaner",
    image: "/products/chemspec-cotton-upholstery-official.jpg",
    chemistryGroups: ["detergents", "acidRinses"],
    description: {
      ua: "М’який слабокислий порошковий засіб Chemspec для екстракційного чищення бавовняної оббивки та інших натуральних волокон рослинного походження. Допомагає зменшити ризик побуріння целюлозних волокон і скоротити час висихання; окремий пре-спрей не потрібен. Розчиніть 50 г у 2 л теплої води (1:19), перемішуйте 2–3 хвилини та використовуйте в миючому пилососі. pH 6,3. Професійний засіб: працюйте в рукавичках і захисних окулярах, не змішуйте з кислотами.",
      ru: "Мягкое слабокислое порошковое средство Chemspec для экстракционной чистки хлопковой обивки и других натуральных волокон растительного происхождения. Помогает снизить риск побурения целлюлозных волокон и сократить время высыхания; отдельный пре-спрей не требуется. Растворите 50 г в 2 л тёплой воды (1:19), перемешивайте 2–3 минуты и используйте в моющем пылесосе. pH 6,3. Профессиональное средство: работайте в перчатках и защитных очках, не смешивайте с кислотами.",
    },
  },
};

const demoProducts: Product[] = [
  { id: "power-blast", name: "Power Blast", brand: "Global", image: "/products/global-power-blast.png", category: "chemistry", problem: ["grease", "general"], price: 74, sizes: [{label:"1 кг",price:74}], status: "available", description: { ua: "Лужний порошковий засіб для попереднього очищення стійких забруднень.", ru: "Щелочное порошковое средство для предварительной очистки стойких загрязнений." }, chemistryGroups:["prespray"] },
  { id: "ocean", name: "Ocean", brand: "Global", image: "/products/global-ocean.png", category: "chemistry", problem: ["general"], price: 86, sizes: [{label:"5 л",price:86}], status: "available", description: { ua: "Засіб для основного очищення текстильних поверхонь.", ru: "Средство для основной очистки текстильных поверхностей." }, chemistryGroups:["detergents"] },
  { id: "enzyme", name: "Enzymatic Cleaner", brand: "Chemspec", image: "/products/chemspec-enzyme.png", category: "chemistry", problem: ["urine", "blood", "pets"], price: 92, sizes: [{label:"2,7 кг",price:92}], status: "available", description: { ua: "Ензимний засіб для органічних забруднень.", ru: "Энзимное средство для органических загрязнений." }, chemistryGroups:["prespray","stainRemovers"] },
];

function inferProblems(text: string) {
  const s = text.toLowerCase(); const found = ["general"];
  if (/сеч|моч|urine|запах/.test(s)) found.push("urine");
  if (/кров|blood|білков|белков/.test(s)) found.push("blood");
  if (/жир|масл|grease/.test(s)) found.push("grease");
  if (/кава|кофе|вино|чай/.test(s)) found.push("drinks");
  if (/тварин|животн|pet/.test(s)) found.push("pets");
  return found;
}

function inferChemistryGroups(text: string) {
  const s = text.toLowerCase();
  const groups: string[] = [];
  if (/пре-спрей|преспрей|попередн|pre.?spray/.test(s)) groups.push("prespray");
  if (/основн(ий|ое|ого) миюч|екстракторн(ого|ое) чищ|миючий засіб|моющее средство/.test(s)) groups.push("detergents");
  if (/кислотн.*ополіск|кислотн.*ополаск|зменшення ph|сниження ph|для промивки/.test(s)) groups.push("acidRinses");
  if (/плямовивід|пятновывод|видалення .*плям|удаления .*пятен|відбілювач|отбеливатель|кров|ірж|ржав|кава|кофе|вино|ручк|маркер|фарб|краск/.test(s)) groups.push("stainRemovers");
  if (/нейтраліз.*запах|нейтрализ.*запах|неприємн.*запах|плісняв|плесен|ароматизатор/.test(s)) groups.push("odorNeutralizers");
  if (/авто|автомоб|інтер.?єр|интерьер|шкір|кож|пластик|скл|стекл|детейл/.test(s)) groups.push("carChemistry");
  return groups.length ? [...new Set(groups)] : ["detergents"];
}

function mapProduct(row: Record<string, unknown>): Product {
  let variants: Array<{size?:string;price?:number}> = [];
  try {
    const parsed = typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants;
    variants = Array.isArray(parsed) ? parsed.filter((variant): variant is {size?:string;price?:number} => Boolean(variant) && typeof variant === "object") : [];
  } catch {
    variants = [];
  }
  const basePrice = Number(row.price) || 0;
  const sizes = variants.length ? variants.map(v => ({label: v.size || "1 шт.", price: Number(v.price) || basePrice})) : [{label:"1 шт.",price:basePrice}];
  const id = String(row.id);
  const curated = curatedProducts[id];
  const ua = curated?.description.ua || String(row.description || row.short_desc || "");
  const ru = curated?.description.ru || String(row.description_ru || ua);
  const name = curated?.name || String(row.name || "Товар");
  return { id, name, brand:String(row.brand || "Професійна серія"), image:curated?.image || String(row.image_url || ""), category:String(row.category || "chemistry"), problem:inferProblems(`${name} ${ua}`), price:Math.min(...sizes.map(v=>v.price)), sizes, status:row.in_stock === false || row.in_stock === "false" ? "waiting" : "available", description:{ua,ru}, chemistryGroups:curated?.chemistryGroups || inferChemistryGroups(`${name} ${row.short_desc} ${ua}`) };
}

const copy = {
  ua: {
    catalog: "Каталог", sets: "Готові набори", videos: "Відеопояснення", training: "Навчання", cart: "Кошик",
    eyebrow: "ПРОФЕСІЙНА ХІМІЯ ДЛЯ ХІМЧИСТКИ МЕБЛІВ", hero: "Засоби, які майстер перевірив у роботі",
    heroText: "Оберіть проблему — ми покажемо відповідні засоби. Простими словами, без складних професійних термінів.", choose: "Підібрати засіб", openCatalog: "Перейти до каталогу",
    checked: "Перевірено майстром", simple: "Пояснюємо просто", europe: "Доставка Україною та Європою",
    problemTitle: "Що потрібно видалити?", problemText: "Оберіть проблему — покажемо відповідні товари", all: "Усі товари", urine: "Сеча та запах", blood: "Кров", grease: "Жирні плями", drinks: "Кава та вино", pets: "Сліди тварин", unsure: "Не знаю, що обрати",
    catalogTitle: "Каталог товарів", catalogText: "Спочатку оберіть розділ, а потім потрібну підкатегорію.", professionalCatalog:"ПРОФЕСІЙНИЙ КАТАЛОГ", chemistry: "Хімія", inventory: "Інвентар для хімчистки", equipment: "Обладнання",
    chemistryHint:"Професійні засоби для меблів, килимів та салону авто", inventoryHint:"Щітки, розпилювачі, мікрофібри та робочі аксесуари", equipmentHint:"Техніка для хімчистки меблів, авто та миття вікон", videosHint:"Практичні пояснення про хімію та обладнання", setsHint:"Зібрані комплекти для швидкого старту", trainingHint:"Навчальні матеріали та програми майстра",
    equipmentCatalog:"Обладнання для хімчистки меблів і авто", videoExplanations:"Відео пояснення", starterSets:"Готові стартові набори хімії",
    prespray:"Пре-спреї", detergents:"Основні миючі засоби", acidRinses:"Кислотні ополіскувачі", stainRemovers:"Плямовивідники", odorNeutralizers:"Нейтралізатори запахів", carChemistry:"Засоби для хімчистки авто",
    furnitureEquipment:"Для хімчистки меблів і авто", windowEquipment:"Для миття вікон", chemistryVideos:"Про хімію", equipmentVideos:"Про обладнання та миття вікон", sectionSoon:"Цей розділ уже підготовлений у структурі сайту. Товари й матеріали додамо наступним етапом.", backToAll:"Показати всі товари",
    available: "У наявності", low: "Закінчується", waiting: "Очікуємо постачання", from: "від", size: "Фасування", add: "Додати в кошик", added: "Додано",
    details: "Детальніше", loading:"Завантажуємо каталог…", fullDescription:"Про товар",
    cartTitle: "Ваш кошик", cartEmpty: "Кошик поки порожній", cartHint: "Товари зберігатимуться на цьому пристрої 24 години.", clear: "Очистити кошик", total: "Разом", continue: "Продовжити вибір", close: "Закрити", remove: "Видалити",
    checkout: "Оформити замовлення", checkoutTitle: "Дані для замовлення", name: "Ім’я та прізвище", phone: "Номер телефону", telegram: "Telegram", delivery: "Спосіб доставки", post: "Поштове відправлення", courier: "Кур’єр", pickup: "Самовивіз", agreeDelivery: "Узгодити з менеджером", country: "Країна", city: "Місто", destination: "Відділення пошти або адреса", sendOrder: "Надіслати замовлення", sending: "Надсилаємо…", orderSuccess: "Замовлення успішно надіслано", orderSuccessText:"Віталій уже отримав ваше замовлення. Щоб швидше узгодити наявність і доставку, напишіть йому в Telegram.", contactVitalii:"Написати Віталію в Telegram", telegramMessage:"Добрий день! Я сформував кошик на сайті та хочу оформити замовлення.", closeSuccess:"Закрити", orderError: "Не вдалося надіслати замовлення. Спробуйте ще раз.", required: "Заповніть обов’язкові поля.", backToCart: "Повернутися до кошика",
    trainingTitle:"Курс із професійної хімчистки", trainingText:"Практичне навчання Віталія: робота з хімією, обладнанням і складними забрудненнями.", openCourse:"Перейти на сторінку курсу", followMaster:"Віталій у соцмережах", contactsText:"Відео, практичні поради та робочі приклади з хімчистки.",
    videoLibrary:"База практичних відео", videoTitle:"Дивіться, як майстер працює з хімією та обладнанням", videoText:"Короткі пояснення без зайвої теорії: вибір засобу, правильне розведення, техніка роботи й типові помилки.", videoChemistryText:"Застосування засобів, готові набори, пропорції та робота зі складними плямами.", videoEquipmentText:"Налаштування техніки, догляд за обладнанням і практичні прийоми.", openYoutube:"Перейти на YouTube-канал", watchVideo:"Дивитися відео", closeVideo:"Закрити відео",
    searchProducts:"Пошук товару за назвою", shownProducts:"Показано", ofProducts:"із", productsWord:"товарів", openFullCatalog:"Переглянути весь каталог", showMoreProducts:"Показати ще товари", noProducts:"За цим запитом товарів не знайдено",
  },
  ru: {
    catalog: "Каталог", sets: "Готовые наборы", videos: "Видеообъяснения", training: "Обучение", cart: "Корзина",
    eyebrow: "ПРОФЕССИОНАЛЬНАЯ ХИМИЯ ДЛЯ ХИМЧИСТКИ МЕБЕЛИ", hero: "Средства, которые мастер проверил в работе",
    heroText: "Выберите проблему — мы покажем подходящие средства. Простыми словами, без сложных профессиональных терминов.", choose: "Подобрать средство", openCatalog: "Перейти в каталог",
    checked: "Проверено мастером", simple: "Объясняем просто", europe: "Доставка по Украине и Европе",
    problemTitle: "Что нужно удалить?", problemText: "Выберите проблему — покажем подходящие товары", all: "Все товары", urine: "Моча и запах", blood: "Кровь", grease: "Жирные пятна", drinks: "Кофе и вино", pets: "Следы животных", unsure: "Не знаю, что выбрать",
    catalogTitle: "Каталог товаров", catalogText: "Сначала выберите раздел, а затем нужную подкатегорию.", professionalCatalog:"ПРОФЕССИОНАЛЬНЫЙ КАТАЛОГ", chemistry: "Химия", inventory: "Инвентарь для химчистки", equipment: "Оборудование",
    chemistryHint:"Профессиональные средства для мебели, ковров и салона авто", inventoryHint:"Щётки, распылители, микрофибры и рабочие аксессуары", equipmentHint:"Техника для химчистки мебели, авто и мойки окон", videosHint:"Практические объяснения о химии и оборудовании", setsHint:"Собранные комплекты для быстрого старта", trainingHint:"Учебные материалы и программы мастера",
    equipmentCatalog:"Оборудование для химчистки мебели и авто", videoExplanations:"Видеообъяснения", starterSets:"Готовые стартовые наборы химии",
    prespray:"Пре-спреи", detergents:"Основные моющие средства", acidRinses:"Кислотные ополаскиватели", stainRemovers:"Пятновыводители", odorNeutralizers:"Нейтрализаторы запахов", carChemistry:"Средства для химчистки авто",
    furnitureEquipment:"Для химчистки мебели и авто", windowEquipment:"Для мойки окон", chemistryVideos:"О химии", equipmentVideos:"Об оборудовании и мойке окон", sectionSoon:"Этот раздел уже подготовлен в структуре сайта. Товары и материалы добавим на следующем этапе.", backToAll:"Показать все товары",
    available: "В наличии", low: "Заканчивается", waiting: "Ожидаем поставку", from: "от", size: "Фасовка", add: "Добавить в корзину", added: "Добавлено",
    details: "Подробнее", loading:"Загружаем каталог…", fullDescription:"О товаре",
    cartTitle: "Ваша корзина", cartEmpty: "Корзина пока пуста", cartHint: "Товары сохранятся на этом устройстве на 24 часа.", clear: "Очистить корзину", total: "Итого", continue: "Продолжить выбор", close: "Закрыть", remove: "Удалить",
    checkout: "Оформить заказ", checkoutTitle: "Данные для заказа", name: "Имя и фамилия", phone: "Номер телефона", telegram: "Telegram", delivery: "Способ доставки", post: "Почтовая отправка", courier: "Курьер", pickup: "Самовывоз", agreeDelivery: "Согласовать с менеджером", country: "Страна", city: "Город", destination: "Отделение почты или адрес", sendOrder: "Отправить заказ", sending: "Отправляем…", orderSuccess: "Заказ успешно отправлен", orderSuccessText:"Виталий уже получил ваш заказ. Чтобы быстрее согласовать наличие и доставку, напишите ему в Telegram.", contactVitalii:"Написать Виталию в Telegram", telegramMessage:"Добрый день! Я сформировал корзину на сайте и хочу оформить заказ.", closeSuccess:"Закрыть", orderError: "Не удалось отправить заказ. Попробуйте ещё раз.", required: "Заполните обязательные поля.", backToCart: "Вернуться в корзину",
    trainingTitle:"Курс по профессиональной химчистке", trainingText:"Практическое обучение Виталия: работа с химией, оборудованием и сложными загрязнениями.", openCourse:"Перейти на страницу курса", followMaster:"Виталий в соцсетях", contactsText:"Видео, практические советы и рабочие примеры из химчистки.",
    videoLibrary:"База практических видео", videoTitle:"Смотрите, как мастер работает с химией и оборудованием", videoText:"Короткие объяснения без лишней теории: выбор средства, правильное разведение, техника работы и типичные ошибки.", videoChemistryText:"Применение средств, готовые наборы, пропорции и работа со сложными пятнами.", videoEquipmentText:"Настройка техники, уход за оборудованием и практические приёмы.", openYoutube:"Перейти на YouTube-канал", watchVideo:"Смотреть видео", closeVideo:"Закрыть видео",
    searchProducts:"Поиск товара по названию", shownProducts:"Показано", ofProducts:"из", productsWord:"товаров", openFullCatalog:"Посмотреть весь каталог", showMoreProducts:"Показать ещё товары", noProducts:"По этому запросу товары не найдены",
  },
};

function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    urine: <><path d="M12 2S6 9 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12Z"/><path d="M9 15c.7 1.6 1.8 2.3 3.4 2.1"/></>,
    blood: <path d="M12 2S6 9.2 6 14a6 6 0 0 0 12 0c0-4.8-6-12-6-12Z"/>,
    grease: <><path d="m7 4 2 3-3 2 3 2-2 4 4-1 2 4 2-4 4 1-2-4 3-2-4-1-1-4-3 2Z"/></>,
    drinks: <><path d="M6 3h9l-1 8a4 4 0 0 1-7 0L6 3Z"/><path d="M10.5 14v7M7 21h7"/></>,
    pets: <><circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="4" cy="13" r="2"/><circle cx="20" cy="13" r="2"/><path d="M8 20c-3-2-2-7 4-7s7 5 4 7c-2 2-6 2-8 0Z"/></>,
    unsure: <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-1 .5-1.3 1.2-1.3 2.2M12 17h.01"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name]}</svg>;
}

export default function Home() {
  const [lang, setLang] = useState<Language>("ua");
  const [category, setCategory] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [problem, setProblem] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [toast, setToast] = useState("");
  const [products, setProducts] = useState<Product[]>(() => (catalogRows as Array<Record<string, unknown>>).map(mapProduct));
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [fullCatalogOpen, setFullCatalogOpen] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    const savedLanguage = localStorage.getItem("cleantapi-language") as Language | null;
    // Restore browser-only preferences after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedLanguage === "ua" || savedLanguage === "ru") setLang(savedLanguage);
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "null");
      if (saved?.expiresAt > Date.now() && Array.isArray(saved.items)) setCart(saved.items);
      else localStorage.removeItem(CART_KEY);
    } catch { localStorage.removeItem(CART_KEY); }
    setCartHydrated(true);
    fetch(`/api/products`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("catalog")))
      .then(rows => { if (Array.isArray(rows) && rows.length) setProducts(rows.map(mapProduct)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { localStorage.setItem("cleantapi-language", lang); }, [lang]);
  useEffect(() => {
    if (!cartHydrated) return;
    if (cart.length) localStorage.setItem(CART_KEY, JSON.stringify({ items: cart, expiresAt: Date.now() + CART_TTL }));
    else localStorage.removeItem(CART_KEY);
  }, [cart, cartHydrated]);

  const filtered = useMemo(() => products.filter((p) => {
    const sectionMatch = category === "all" || (category === "chemistry" && p.category === "chemistry") || (category === "inventory" && ["tools","accessories"].includes(p.category)) || (category === "equipment" && ((subCategory === "windowEquipment" && p.category === "window-equipment") || (subCategory !== "windowEquipment" && p.category === "equipment")));
    const subMatch = category !== "chemistry" || subCategory === "all" || p.chemistryGroups.includes(subCategory);
    const searchMatch = !search.trim() || `${p.name} ${p.brand}`.toLocaleLowerCase(lang === "ua" ? "uk" : "ru").includes(search.trim().toLocaleLowerCase(lang === "ua" ? "uk" : "ru"));
    return sectionMatch && subMatch && searchMatch && (problem === "all" || problem === "unsure" || p.problem.includes(problem));
  }), [products, category, subCategory, problem, search, lang]);
  const visibleProducts = filtered.slice(0, visibleCount);
  const bundleProducts = useMemo<Product[]>(() => bundles.map(bundle => ({ id:bundle.id, name:bundle.title[lang], brand:lang === "ua" ? "Готовий набір" : "Готовый набор", image:products.find(p=>p.id===bundle.items[0].productId)?.image || "", category:"sets", problem:[], price:bundle.price, sizes:[{label:lang === "ua" ? "1 набір" : "1 набор",price:bundle.price}], status:"available", description:bundle.description, chemistryGroups:[] })), [products, lang]);
  const orderProducts = useMemo(() => [...products, ...bundleProducts], [products, bundleProducts]);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => { const product = orderProducts.find((p) => p.id === item.productId); const unit=product?.sizes.find(v=>v.label===item.size)?.price||product?.price||0; return sum + unit * item.qty; }, 0);

  const add = (product: Product, size: string) => {
    if (product.status === "waiting") return;
    setCart((prev) => { const found = prev.find((i) => i.productId === product.id && i.size === size); return found ? prev.map((i) => i === found ? { ...i, qty: i.qty + 1 } : i) : [...prev, { productId: product.id, size, qty: 1 }]; });
    setToast(t.added); setTimeout(() => setToast(""), 1400);
  };
  const changeQty = (item: CartItem, delta: number) => setCart((prev) => prev.map((i) => i === item ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0));
  const jumpCatalog = () => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  const jumpResults = () => document.getElementById("catalog-results")?.scrollIntoView({ behavior: "auto", block: "start" });
  const jumpVideoLibrary = () => document.getElementById("video-library")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const selectProblem = (id: string) => {
    setProblem(id);
    setCategory("all");
    setSearch("");
    setVisibleCount(12);
    setFullCatalogOpen(true);
    window.setTimeout(() => {
      window.location.hash = "catalog-results";
      jumpResults();
    }, 320);
  };
  const selectCategory = (id: string) => { setCategory(id); setSubCategory("all"); setProblem("all"); setSearch(""); setVisibleCount(12); setFullCatalogOpen(true); setMobileMenuOpen(false); window.setTimeout(() => { window.location.hash = "catalog-results"; jumpResults(); }, 320); };
  const selectVideoType = (id: "chemistryVideos" | "equipmentVideos") => {
    setSubCategory(id);
    window.setTimeout(jumpVideoLibrary, 60);
  };

  return <main>
    <header className="site-header"><div className="container nav">
      <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="CleanTapi — на початок"><img src="/cleantapi-logo.png" alt="CleanTapi"/></button>
      <nav><button onClick={jumpCatalog}>{t.catalog}</button><button onClick={()=>selectCategory("sets")}>{t.sets}</button><button onClick={()=>selectCategory("videos")}>{t.videos}</button><button onClick={()=>selectCategory("training")}>{t.training}</button></nav>
      <div className="nav-actions"><div className="language" aria-label="Language"><button className={lang === "ua" ? "active" : ""} onClick={() => setLang("ua")}>UA</button><span>/</span><button className={lang === "ru" ? "active" : ""} onClick={() => setLang("ru")}>RU</button></div><button className="mobile-menu-button" onClick={()=>setMobileMenuOpen(open=>!open)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Закрити меню" : "Відкрити меню"}><span></span><span></span><span></span></button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={t.cart}><span className="cart-symbol">⌑</span><span>{t.cart}</span><b>{count}</b></button></div>
    </div></header>
    {mobileMenuOpen && <nav className="mobile-nav" aria-label="Мобільне меню"><button onClick={()=>{setMobileMenuOpen(false);jumpCatalog()}}>{t.catalog}<span>→</span></button><button onClick={()=>selectCategory("sets")}>{t.sets}<span>→</span></button><button onClick={()=>selectCategory("videos")}>{t.videos}<span>→</span></button><button onClick={()=>selectCategory("training")}>{t.training}<span>→</span></button></nav>}

    <section className="hero"><div className="container hero-grid">
      <div className="hero-copy"><p className="eyebrow">{t.eyebrow}</p><h1>{t.hero}</h1><p className="hero-text">{t.heroText}</p><div className="hero-buttons"><button className="primary" onClick={jumpCatalog}>{t.openCatalog} <span>→</span></button><button className="secondary" onClick={() => document.getElementById("problems")?.scrollIntoView({ behavior: "smooth" })}>{t.choose} <span>→</span></button></div><div className="trust"><span>◇ {t.checked}</span><span>◌ {t.simple}</span><span>▱ {t.europe}</span></div></div>
      <div className="hero-photo"><div className="hero-products"><img src="/products/global-ocean.png" alt="Global Ocean"/><img src="/products/global-power-blast.png" alt="Global Power Blast"/><img src="/products/chemspec-enzyme.png" alt="Chemspec Enzymatic Cleaner"/></div><div className="expert-stamp">✓<span>{t.checked}</span></div></div>
    </div></section>

    <section className="shop-entry container" id="catalog"><div className="catalog-top"><div><p className="e~{ӻh��춻�q�^wې�X��^�
OO�ۑ]Z[���X�
_O�]��\�Ә[YOH���X�Z[XY�H��[Y��\�Ә[YO^�\ИZ�Y�X��ܛ�[����Z�YX�X��ܛ�[������X�X�]�]�Hܘ�^���X��[XY�_H[^�	���X����[�H	���X���[Y_XKϏ�[��\�Ә[YO^��]\�	���X���]\�XO�����X���]\�_O��[���]��]��\�Ә[YOH���X�X��H���\�Ә[YOH���[�[X�[�����X����[�O��Ϟ���X���[Y_O�Ϗ�\�Ә[YOH�\�ܚ\[ۈ�����X��\�ܚ\[ۖ�[��_O��]��\�Ә[YOH��^�K\��Ȉې�X��^�OO�K�����Y�][ۊ
_O��[�����^�_O��[��]�����X���^�\˛X\

�HO��]ۈ�^O^�˛X�[H�\�Ә[YO^��^�HOOH˛X�[��X�]�H����Hې�X��^�
HO��]�^�J˛X�[
_O��˛X�[O؝]ۏ�_O�]���]��]��\�Ә[YOH��X�K[[�H����ۙϞ���X���^�\˛[���O�����N���H�X�]�T�X�_H�`����ۙϏ�]��]��\�Ә[YOH���X�XX�[ۜȏ��]ۈ�\�Ә[YOH�]Z[Ȉې�X��^�JOO��K�����Y�][ۊ
N�ۑ]Z[���X�
__O���]Z[�O؝]ۏ��]ۈ�\�Ә[YOH�YX�]ۈ�\�X�Y^�[�]�Z[X�_Hې�X��^�JHO��K�����Y�][ۊ
N�ېY
��X��^�J__O��[�]�Z[X�H���Z][���
�	��YXO؝]ۏ��]���]���\�X�O�B���[��[ۈ��X�[�[
���X�[��ې���KېYN����X����X��[�Γ[��XY�N��\[و��K�XN�ې���N�
OO���Y�ېY����X��^�N���[��OO���YJ^�ۜ���^�K�]�^�WO]\�T�]J��X���^�\��O˛X�[�H4b4`���N��ۜ��X�O\��X���^�\˙�[�
�O���X�[OO\�^�JO˜�X�_��X���X�N��ۜ�[�]�Z[X�O\��X���]\�OOH��Z][�Ȏ\�QY��X�


OO���ۜ��^OJN��^X��\�]�[�
OO�K��^OOOH�\��\H���ې���J
N���[Y[��Y]�[�\�[�\���^Y�ۈ��^JNܙ]\��
OO���[Y[���[[ݙQ]�[�\�[�\���^Y�ۈ��^J_K�ې���WJN�]\��]��\�Ә[YOH���X�[[�[[^Y\��ۓ[�\�Q�ۏ^�ې���_O��X�[ۈ�\�Ә[YOH���X�[[�[���OH�X[�Ȉ\�XK[[�[H��YH�\�XK[X�[^���X���[Y_Hۓ[�\�Q�ۏ^�OO�K�����Y�][ۊ
_O��]ۈ�\�Ә[YOH�[�[X���H�ې�X��^�ې���_O���؝]ۏ�]��\�Ә[YOH�[�[[YYXH��[Y�ܘ�^���X��[XY�_H[^�	���X����[�H	���X���[Y_XKϏ�[��\�Ә[YO^��]\�	���X���]\�XO�����X���]\�_O��[���]��]��\�Ә[YOH�[�[X��H���\�Ә[YOH���[�[X�[�����X����[�O�������X���[Y_O����\�Ә[YOH�[�[Z�X��\������[\�ܚ\[۟O���\�Ә[YOH�[�[Y\�ܚ\[ۈ�����X��\�ܚ\[ۖ�[��_O��]��\�Ә[YOH�[�[\�^�\ȏ��[�����^�_O��[��]�����X���^�\˛X\
�O��]ۈ�^O^݋�X�[H�\�Ә[YO^��^�OOO]��X�[ȘX�]�H����Hې�X��^�
OO��]�^�J��X�[
_O�݋�X�[H0��݋��X�_H�`�؝]ۏ�_O�]���]����ۙ��\�Ә[YOH�[�[\�X�H����X�_H�`����ۙϏ�]ۈ�\�Ә[YOH�[�[XY�\�X�Y^�[�]�Z[X�_Hې�X��^�
OO�ېY
��X��^�J_O��[�]�Z[X�O���Z][�Θ
�	��YXO؝]ۏ��]����X�[ۏ��]���B���[��[ۈ�X���]�ܛJ�[��][\��[ې�X��۔�X��\��N��[�Γ[��XY�N��\[و��K�XN�][\Γܙ\�][V�N��[��[X�\��ې�X�Ί
OO���Y�۔�X��\�Ί
OO���YJ^�ۜ�ۙP��\�H���N����X�[��
��K���N����ȋX�[����
��ȟK���N�����X�[��PH
���K���N���H�X�[��H
�H�K���N�����X�[��ֈ
���K���N����H�X�[����
��H�K���N����X�[��R�
��K���N����LȋX�[��QH
��LȟK���N����H�X�[��U
��H�K���N�����X�[��T�
���K���N����H�X�[���
��H�K���N���̈�X�[���H
�̈�K���N������X�[��
����K���N�����H�X�[���
���H�K���N����̈�X�[��QH
��̈�K���N���H�X�[��T���H
�H�K�N�ۜ��ۙP��K�]ۙP��WO]\�T�]J���N�ۜ�ٛܛK�]�ܛWO]\�T�]Jۘ[YN���ۙN���[Yܘ[N���[]�\�N�������[��N�����H��]N���\�[�][ێ����X��]N���JN�ۜ���X�Z][���]�X�Z][��O]\�T�]J�[�JN��ۜ��\��܋�]\��ܗO]\�T�]J��N�ۜ�\]OJ�^N��^[و\[و�ܛK�[YN���[��OO��]�ܛJ�\��[�O�ˋ���\��[���^WN��[Y_JJN�ۜ��ܛX]ۙOJ�[YN���[��OO��[YK��\X�J�����K��X�JL�K��\X�J���JJ�W
K���H�N�ۜ��X�Z]X\�[��N��XX���ܛQ]�[�
OO��K��]�[�Y�][

N��]\��܊��N�Y�Y�ܛK��[YK��[J
_�ܛK�ۙK��\X�J�����K�[���Y�ܛK���[��K��[J
_Y�ܛK��]K��[J
_Y�ܛK�\�[�][ۋ��[J
J^��]\��܊��\]Z\�Y
Nܙ]\���\�]�X�Z][���YJN��^��ۜ��\�ۜ�OX]�Z]�]�
��\K�ܙ\���Y]������XY\�ΞȐ�۝[�U\H���\X�][ۋڜ�ۈ�K��N���Ӌ���[��Y�Jˋ���ܛKۙN�	�ۙP��_H	ٛܛK�ۙ_X��[J
K[��XY�N�[��][\�J_JN�Y�\�\�ۜ�K���]����]�\��܊�ܙ\��N�۔�X��\��
N�X�]���]\��܊�ܙ\�\��܊N�Y�[�[^��]�X�Z][���[�JN�_N�]\���ܛH�\�Ә[YOH��X���]Y�ܛH�۔�X�Z]^��X�Z]O�]��\�Ә[YOH��X���]]�[���[�����[O��[����ۙϞ��[H�`����ۙϏ�]��X�[����[Y_O[�]�[YO^ٛܛK��[Y_Hې�[��O^�OO�\]J��[YH�K�\��]��[YJ_H]]���\]OH��[YH�X^[��^�LH�\]Z\�YϏ�X�[�X�[���ۙ_O]��\�Ә[YOH�ۙKZ[�]���[X�\�XK[X�[^����[��_H�[YO^�ۙP��_Hې�[��O^�OO��]ۙP��JK�\��]��[YJ_O��ۙP��\˛X\
][OO��[ۈ�^O^�][K���_H�[YO^�][K���_O��][K�X�[O��[ۏ�_O��[X��[�]\OH�[�[�][�OH��[Y\�XȈ�[YO^ٛܛK�ۙ_Hې�[��O^�OO�\]J�ۙH��ܛX]ۙJK�\��]��[YJJ_H]]���\]OH�[[�][ۘ[�X�Z�\�H�LH��M�ȈX^[��^�M_H�\]Z\�YϏ�]���X�[�X�[���[Yܘ[_O[�]�[YO^ٛܛK�[Yܘ[_Hې�[��O^�OO�\]J�[Yܘ[H�K�\��]��[YJ_HX�Z�\�H�\�\��[YH�X^[��^�KϏ�X�[�X�[���[]�\�_O�[X��[YO^ٛܛK�[]�\�_Hې�[��O^�OO�\]J�[]�\�H�K�\��]��[YJ_O��[ۈ�[YOH���������O��[ۏ��[ۈ�[YOH���\�Y\�������\�Y\�O��[ۏ��[ۈ�[YOH�X��\����X��\O��[ۏ��[ۈ�[YOH�YܙYH����YܙYQ[]�\�_O��[ۏ���[X���X�[�]��\�Ә[YOH��X���]YܚY��X�[�����[��_O[�]�[YO^ٛܛK���[��_Hې�[��O^�OO�\]J���[��H�K�\��]��[YJ_H]]���\]OH���[��K[�[YH�X^[��^�H�\]Z\�YϏ�X�[�X�[����]_O[�]�[YO^ٛܛK��]_Hې�[��O^�OO�\]J��]H�K�\��]��[YJ_H]]���\]OH�Y�\��[]�[��X^[��^�LH�\]Z\�YϏ�X�[��]��X�[���\�[�][۟O[�]�[YO^ٛܛK�\�[�][۟Hې�[��O^�OO�\]J�\�[�][ۈ�K�\��]��[YJ_H]]���\]OH���Y]XY�\�ȈX^[��^�M�H�\]Z\�YϏ�X�[�X�[�\�Ә[YOH��X��]KY�Y[�\�XKZY[�H��YH���X��]O[�]X�[�^^�L_H]]���\]OH�ٙ���[YO^ٛܛK��X��]_Hې�[��O^�OO�\]J��X��]H�K�\��]��[YJ_KϏ�X�[��\��܉���\�Ә[YOH��ܛKY\��܈���OH�[\����\��ܟO��O�]ۈ�\�Ә[YOH��X�Z][ܙ\��\OH��X�Z]�\�X�Y^��X�Z][��O���X�Z][�����[�[�Θ	���[�ܙ\�H8���O؝]ۏ��]ۈ�\�Ә[YOH��X��X�\��\OH��]ۈ�ې�X��^�ې�X��O������X����\�O؝]ۏ�ٛܛO�B