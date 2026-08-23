# Качество текста и очеловечивание AI: смежные техники и инструменты

Отчёт по дополнению скилла `humanizer-ru` (локальный клон:
`tools/humanizer-ru`). Цель — конкретные смежные техники, сканеры,
русскоязычный NLP и паттерны встраивания gate в оркестрацию агента.

---

## 1. Дополнительные техники очеловечивания

Ядро скилла (статистическое отклонение, контрастное вычитание, burstiness)
подтверждается внешними источниками 2025–2026. Что добавить:

- **Style transfer, а не парафраз.** Свежие атаки идут через style transfer
  (MASH: 92% ASR на GPTZero), а не через синонимическую замену — простой
  парафраз перестал работать (adversarial paraphrasing теряет 87.88% TPR).
  В скилле это эквивалент «голосовой калибровке» (Шаг 2) — вынести в явный
  отдельный проход.
- **Controlled disfluency (arXiv:2412.12710).** Контролируемое внесение
  «шероховатостей» (частицы, короткие склейки, опечатки в неформальном) —
  поднимает perplexity без порчи смысла. Перекликается с паттернами #36/#37.
- **Embedding-guided token substitution (arXiv:2501.18998).** Замена токенов
  ближайшими по эмбеддингам против perplexity-детекторов; для русского —
  через `natasha/navec` или `sismetanin/ruword2vec`.
- **Self-Disguise (arXiv:2508.15848).** RAG по «трудным» человеческим
  примерам (detection-resistant exemplars) как источник голоса.
- **HyPerAlign (arXiv:2505.00038).** Hypothesis-driven персонализация под
  стиль конкретного автора — формализация Шага 2.
- **Burstiness-инженерия (3-1-5 pattern).** 1 короткое (5–8 слов) → 1 длинное
  (40+ слов) → 5 средних. Проверка: ст. откл. длины предложений до/после
  должно вырасти ≥2× (иначе правка — театр).
- **Метрика «uncertainty gap» (2026).** человеческий текст последовательно
  менее предсказуем; instruction tuning и reasoning модели усиливают
  предсказуемость — контрастное вычитание это закрывает.

## 2. Сканеры / скрипты оценки «чистоты» (что переиспользовать)

Локально уже есть детерминированный `skills/humanizer-ru/scripts/scan.py`
+ `humanizer_metrics/*` (burstiness, markers, morphology, structure, score) и
`eval/detectors/*` (base, gptzero, originality, ru_roberta, ollama_ppl,
ollama_llm). Это готовый каркас gate — переиспользовать, не писать заново.

Дополнительно:
- **GPTZero API** (`POST https://api.gptzero.me/v2/predict/text`) — возвращает
  `perplexity` и `burstiness` отдельно + sentence-level heatmap. Аналог
  `eval/detectors/gptzero.py`. Бесплатный tier 5 000 символов/скан.
- **Originality.ai API** (docs.originality.ai) — BERT-классификатор
  (патент US 12,253,988), ловит парафраз/Quillbot; `score` = вероятность AI.
  Аналог `eval/detectors/originality.py`. Возвращает ещё plagiarism/fact-check.
- **k1y0mi/ru-ai-text-detector** (HF) — fine-tuned `ai-forever/ruBert-base`,
  решает human/AI для русского. Заменяет плейсхолдер `RADAR-Vicuna-7B` в
  `ru_roberta.py` (DEFAULT_MODEL) на реальную модель.
- **ollama_ppl.py / ollama_llm.py** — локальный perplexity через Ollama,
  без утечки текста наружу (важно для академических данных).
- **Текст-аудит перед выдачей** (паттерн из texthumanize.link `/api/detect`):
  `artificiality_score`, `burstiness_score`, `bureaucratic_ratio`,
  `connector_ratio` — те же сигналы, что считает scan.py, плюс соотношение
  канцелярита/связок.

Команды (переиспользуем локальное):
```powershell
pip install razdel pymorphy3
python tools\humanizer-ru\skills\humanizer-ru\scripts\scan.py file.txt --json --genre academic
# локальный перплексий-детектор:
$env:RU_DETECTOR_MODEL="k1y0mi/ru-ai-text-detector"
python tools\humanizer-ru\eval\run_eval.py --text file.txt
```

## 3. Русскоязычный NLP (морфология, пунктуация, аудит)

- **natasha/razdel** (MIT) — rule-based токенизация/сегментация для русского;
  уже в `requirements` скилла. Быстрее spaCy на русском, точнее на границах
  предложений (ошибки ~43/1000 предл. vs DeepPavlov 41).
- **pymorphy2 / pymorphy3** (no-plagiarism/pymorphy3, MIT) — морф. анализатор
  (падеж, род, вид, согласования). База для `humanizer_metrics/morphology.py`.
- **DeepPavlov/rubert-base-cased** + **RussianNLP** org (rucola, russian_super_glue,
  nerus) — эмбеддинги/классификаторы для stylometric-аудита (TTR, POS-density,
  noun/verb ratio), что поддерживает паттерн #14 скилла.
- **stanfordnlp/stanza** — полный UD-pipeline (POS, lemma, dep parse, feats) на
  70+ яз., высокая академическая точность; тяжёлый (PyTorch). Через
  `explosion/spacy-stanza` даёт spaCy-API поверх Stanford-моделей.
- **explosion/spaCy** (`ru_core_news_lg`) — production-готовый парсинг, быстрый;
  `spacy-llm` встраивает LLM в structured pipeline (удобно для gate).
- **sismetanin/russian-nlp-resources** — агрегатор словарей/эмбеддингов
  (ruword2vec) для embedding-guided замен.
- **natasha/navec** — компактные русские word vectors для оценки «неожиданности»
  слова (surprisal) вручную, без вызова LLM-детектора.

## 4. Gate перед выдачей агента

Паттерн «gate»: текст не уходит к пользователю, пока не пройдёт аудит.
```text
LLM -> draft -> scan.py (HARD BANS + score) -> RU_DETECTOR (ru_roberta)
  -> если score<60 или bans>0: вернуть в Шаг 3 переписывания (loop, max N)
  -> иначе: отдать + "было N, стало M"
```
- Сканер недетерминированный? Молча работать по каталогу (уже в SKILL.md).
- Детекторы — как доп. сигнал, не вердикт (GPTZero/Originality: «risk
  indicator», не доказательство). Держать человека в контуре для
  high-stakes (академия).
- Офлайн-приоритет: `ollama_ppl` + `ru_roberta` (k1y0mi) вместо внешних API,
  чтобы не слить студенческие/курсовые тексты third-party.
- Пороги из скилла: ≥85 чисто, 60–84 точечная правка, <60 рерайт.

## 5. Риски и ограничения

- **Domain shift.** Детекторы не обобщаются между доменами (март 2026):
  модель на научных текстах плохо ловит блоги. Вывод: чем уже ниша (жаргон,
  формат аудитории), тем труднее детектировать — аргумент за голосовую
  калибровку и `--genre`.
- **Perturbation-invariant детекторы (PIFE, 2025, arXiv:2510.02319).** сохраняет
  82.6% TPR после атак — простой парафраз больше не спасает.
- **Diffusion-LLM (LLaDA и др.)** имитируют burstiness людей -> burstiness
  становится ненадёжным сигналом (Tarım & Onan 2025).
- **False positives.** технический/формальный/научный текст (legal, medical,
  abstracts) триггерит детекторы из-за низкой энтропии — отсюда `--genre
  academic/legal` в scan.py (снимает баны, законные для регистра).
- **Turnitin AIR-1** при агрессивных настройках: лучшие хуманайзеры дают лишь
  58–67% bypass — для академии надёжного обхода нет; риск академической
  недобросовестности.
- **Watermarking (WLLM, AUROC>0.99)** — если провайдер ставит водяной знак,
  ни один хуманайзер не поможет.
- **Гомогенизация (DAMAGE).** единообразная перепись через один инструмент
  создаёт «гуманизированный» стиль, сам детектируемый — варьировать подход.
- **Этика/безопасность.** humanizer не для обхода проверок в вузах/публикациях
  без разрешения; держать Fact-замок (не выдумывать факты).

---

## Изученные репозитории и источники

Локально прочитано: `tools/humanizer-ru` (SKILL.md, catalog.md, scan.py,
humanizer_metrics/*, eval/detectors/*).

Внешние (web/gh):
1. `mrshibly/humanizer` (GitHub) — 8-step pipeline, burstiness injection.
2. GPTZero methodology/docs (`gptzero.me`, `gpt-zero.com/methodology`) — perplexity+burstiness.
3. Originality.ai API/docs (`docs.originality.ai`, `originality.ai`) — BERT-детектор.
4. `DeepPavlov/rubert-base-cased` + `RussianNLP` org (HF/GitHub) — рус. BERT/корпуса.
5. `k1y0mi/ru-ai-text-detector` (HF) — готовый рус. AI-детектор.
6. `huggingface/transformers` — инференс детекторов (ru_roberta.py).
7. `stanfordnlp/stanza` — UD-pipeline для рус. морфологии/синтаксиса.
8. `explosion/spaCy` + `explosion/spacy-stanza` — production NLP + spaCy-LLM gate.
9. `natasha/razdel`, `natasha/navec`, `natasha/yargy` — рус. токенизация/эмбеддинги.
10. `pymorphy2/pymorphy2` и `no-plagiarism/pymorphy3` — морф. анализ.
11. `Rasul/awesome-russian-nlp` и `RussianNLP` — агрегаторы рус. NLP.
12. `sismetanin/russian-nlp-resources` (ruword2vec) — словари для замен.
13. `keon/awesome-nlp`, `ChenChengKuan/awesome-text-generation` — обзоры NLP/генерации.
14. `fdmas/Awesome-AIGCDetection` — бенчмарки/детекторы AI-текста.
15. `gpt-humanizer/gpt-humanizer` (по запросу) — концепт humanizer-пайплайнов.

Ключевые статьи: DivEye 2025 (surprisal 2-я производная — 39.4% вклада),
CoPA/EMNLP 2025 (contrastive subtraction), PIFE 2025, MASH (style transfer
92% ASR), AINL-Eval 2025 (рус. бенчмарк, ~86% SOTA).
