-- Starter topic set (§7 M1). Ten topics covering common everyday
-- vocabulary areas, roughly ordered by typical difficulty.
insert into public.topics (slug, name_en, name_vi, cefr_hint) values
  ('family-relationships', 'Family & Relationships', 'Gia đình & Các mối quan hệ', 'A1'),
  ('food-cooking',         'Food & Cooking',         'Ẩm thực & Nấu ăn',           'A1'),
  ('home-daily-routines',  'Home & Daily Routines',  'Nhà cửa & Sinh hoạt hằng ngày', 'A1'),
  ('shopping-money',       'Shopping & Money',       'Mua sắm & Tiền bạc',         'A2'),
  ('travel',               'Travel',                 'Du lịch',                    'A2'),
  ('health-body',          'Health & Body',          'Sức khỏe & Cơ thể',          'A2'),
  ('weather-nature',       'Weather & Nature',       'Thời tiết & Thiên nhiên',    'A2'),
  ('education-school',     'Education & School',     'Giáo dục & Trường học',      'B1'),
  ('work-career',          'Work & Career',          'Công việc & Sự nghiệp',      'B1'),
  ('technology-communication', 'Technology & Communication', 'Công nghệ & Giao tiếp', 'B1')
on conflict (slug) do nothing;

-- Grammar syllabus, first 10 units (§7 M3). Ordering follows the
-- conventional sequence (tenses -> modals -> conditionals -> ...).
-- Explanations and exercises are original, written for this project.
insert into public.grammar_units (order_index, title_en, title_vi, topic_area, cefr_level, explanation_md) values
(1, 'Present Simple', 'Thì hiện tại đơn', 'tenses', 'A1', $$## Cách dùng

Thì hiện tại đơn diễn tả **sự thật, thói quen, hoặc lịch trình cố định**.

## Cấu trúc

- Khẳng định: `S + V(s/es)` — *She works in a small office.*
- Phủ định: `S + do/does + not + V` — *They don't work on Sundays.*
- Nghi vấn: `Do/Does + S + V?` — *Does he work near here?*

Ngôi thứ ba số ít (he/she/it) thêm **-s** hoặc **-es** vào động từ:
`work -> works`, `watch -> watches`, `study -> studies`.

## Dấu hiệu nhận biết

`always`, `usually`, `often`, `sometimes`, `never`, `every day`, `on Mondays`.
$$),
(2, 'Present Continuous', 'Thì hiện tại tiếp diễn', 'tenses', 'A1', $$## Cách dùng

Thì hiện tại tiếp diễn diễn tả **hành động đang xảy ra ngay lúc nói**, hoặc
một việc mang tính tạm thời, hoặc một kế hoạch đã sắp xếp trong tương lai gần.

## Cấu trúc

- Khẳng định: `S + am/is/are + V-ing` — *I am cooking dinner right now.*
- Phủ định: `S + am/is/are + not + V-ing` — *She isn't listening.*
- Nghi vấn: `Am/Is/Are + S + V-ing?` — *Are you working today?*

## Dấu hiệu nhận biết

`now`, `right now`, `at the moment`, `today`, `this week`.

Lưu ý: một số động từ chỉ trạng thái (know, like, want, believe) thường
**không** dùng ở thì tiếp diễn.
$$),
(3, 'Past Simple', 'Thì quá khứ đơn', 'tenses', 'A1', $$## Cách dùng

Thì quá khứ đơn diễn tả **một hành động đã hoàn thành tại một thời điểm cụ
thể trong quá khứ**.

## Cấu trúc

- Khẳng định: `S + V-ed` (động từ có quy tắc) hoặc dạng quá khứ bất quy tắc —
  *We visited my grandmother last month. / They went home early.*
- Phủ định: `S + did not + V (nguyên mẫu)` — *He didn't call yesterday.*
- Nghi vấn: `Did + S + V (nguyên mẫu)?` — *Did you finish the report?*

## Dấu hiệu nhận biết

`yesterday`, `last week/month/year`, `... ago`, `in 2020`.
$$),
(4, 'Countable & Uncountable Nouns', 'Danh từ đếm được và không đếm được', 'articles/nouns', 'A1', $$## Danh từ đếm được vs. không đếm được

Danh từ **đếm được** có thể đứng sau số đếm và có dạng số nhiều:
*a book, two books, three apples.*

Danh từ **không đếm được** không có dạng số nhiều và không đứng trực tiếp
sau số đếm: *water, rice, information, advice.*

## a / an / the

- `a/an` dùng cho danh từ đếm được số ít, khi nhắc đến **lần đầu** hoặc
  không xác định cụ thể: *I saw a cat in the garden.*
- `the` dùng khi người nghe/đọc đã biết **chính xác** vật/người nào đang
  được nói tới: *The cat is sleeping on my bed.* (con mèo vừa nhắc ở trên)
- Không dùng mạo từ với danh từ không đếm được hoặc số nhiều mang nghĩa
  chung chung: *Rice is a common food in Vietnam.*
$$),
(5, 'Past Continuous', 'Thì quá khứ tiếp diễn', 'tenses', 'A2', $$## Cách dùng

Thì quá khứ tiếp diễn diễn tả **một hành động đang xảy ra tại một thời
điểm cụ thể trong quá khứ**, hoặc hành động nền bị một hành động khác
(ở quá khứ đơn) xen vào.

## Cấu trúc

- Khẳng định: `S + was/were + V-ing` — *I was studying at 9pm last night.*
- Phủ định: `S + was/were + not + V-ing` — *They weren't sleeping.*
- Nghi vấn: `Was/Were + S + V-ing?` — *Was she waiting for you?*

## Kết hợp với quá khứ đơn

*While I was cooking, the phone rang.* — hành động nền (was cooking) bị
hành động ngắn hơn (rang) xen vào, thường dùng với `while`/`when`.
$$),
(6, 'Present Perfect', 'Thì hiện tại hoàn thành', 'tenses', 'A2', $$## Cách dùng

Thì hiện tại hoàn thành nối một hành động trong quá khứ với **hiện tại**:
kết quả của hành động đó vẫn còn liên quan, hoặc hành động xảy ra trong
một khoảng thời gian chưa kết thúc.

## Cấu trúc

- Khẳng định: `S + have/has + past participle` — *She has finished her
  homework.*
- Phủ định: `S + have/has + not + past participle` — *We haven't eaten
  yet.*
- Nghi vấn: `Have/Has + S + past participle?` — *Have you ever visited
  Da Nang?*

## Khác với quá khứ đơn

Quá khứ đơn dùng khi có **mốc thời gian cụ thể đã kết thúc**
(*yesterday, last year*). Hiện tại hoàn thành **không** nêu mốc thời gian
cụ thể, hoặc dùng với `already`, `just`, `yet`, `ever`, `so far`,
`this week`.
$$),
(7, 'Future: will vs. going to', 'Tương lai: will và going to', 'tenses', 'A2', $$## will

Dùng `will` cho:
- Quyết định đưa ra **ngay lúc nói** — *I'm thirsty. I'll get some water.*
- Dự đoán **không có bằng chứng rõ ràng** — *I think it will rain
  someday this week.*
- Lời hứa — *I will call you tomorrow.*

## going to

Dùng `be going to` cho:
- Kế hoạch đã **quyết định từ trước** khi nói — *We're going to visit
  my parents this weekend.* (đã lên kế hoạch)
- Dự đoán **có bằng chứng rõ ràng ngay trước mắt** — *Look at those
  clouds — it's going to rain.*
$$),
(8, 'Modals: can / could / should', 'Động từ khuyết thiếu: can, could, should', 'modals', 'A2', $$## can

Diễn tả **khả năng ở hiện tại** hoặc **sự cho phép**:
*She can speak three languages. / Can I open the window?*

## could

Diễn tả **khả năng trong quá khứ**, hoặc dùng để **hỏi một cách lịch sự**:
*He could swim when he was five. / Could you help me, please?*

## should

Diễn tả **lời khuyên** hoặc điều được cho là đúng nên làm:
*You should see a doctor. / You shouldn't skip breakfast.*
$$),
(9, 'Modals: must / have to', 'Động từ khuyết thiếu: must, have to', 'modals', 'B1', $$## must vs. have to

Cả hai đều diễn tả **sự bắt buộc**, nhưng khác nhau về nguồn gốc:

- `must`: nghĩa vụ đến từ chính **người nói** (cảm thấy cần thiết) —
  *I must call my mother today.*
- `have to`: nghĩa vụ đến từ **quy định, luật lệ, hoặc người khác** —
  *Employees have to wear a uniform.*

## must not vs. don't have to

Đây là chỗ dễ nhầm nhất:

- `must not`: **cấm**, không được làm — *You must not park here.*
- `don't have to`: **không bắt buộc**, có làm hay không cũng được —
  *You don't have to come if you're busy.*
$$),
(10, 'Zero & First Conditional', 'Câu điều kiện loại 0 và loại 1', 'conditionals', 'B1', $$## Câu điều kiện loại 0

Diễn tả **sự thật hiển nhiên, quy luật chung**:

`If + hiện tại đơn, hiện tại đơn` — *If you heat water to 100°C, it
boils.*

## Câu điều kiện loại 1

Diễn tả **tình huống có thật hoặc có khả năng xảy ra ở tương lai**:

`If + hiện tại đơn, will + động từ nguyên mẫu` — *If it rains tomorrow,
we will stay home.*

Mệnh đề `if` có thể đứng sau mệnh đề chính mà không đổi nghĩa:
*We will stay home if it rains tomorrow.*
$$)
on conflict (order_index) do nothing;

insert into public.grammar_exercises (unit_id, position, exercise_type, prompt, choices, correct_answer, explanation_vi)
select u.id, x.position, x.exercise_type, x.prompt, x.choices::jsonb, x.correct_answer, x.explanation_vi
from public.grammar_units u
join (values
  -- Unit 1: Present Simple
  (1, 1, 'fill_blank', $$My sister ___ (work) at a hospital.$$, null, $$works$$, $$Chủ ngữ "my sister" là ngôi thứ ba số ít nên động từ "work" phải thêm "-s": works.$$),
  (1, 2, 'multiple_choice', $$Choose the correct sentence.$$, $$["The train leave at 6am.", "The train leaves at 6am.", "The train are leaving at 6am.", "The train leaved at 6am."]$$, $$The train leaves at 6am.$$, $$"The train" là ngôi thứ ba số ít, thì hiện tại đơn cần thêm "-s": leaves.$$),
  (1, 3, 'error_spotting', $$She don't like coffee in the morning.$$, null, $$don't$$, $$Chủ ngữ "she" là ngôi thứ ba số ít, phải dùng "doesn't", không phải "don't": She doesn't like coffee.$$),
  (1, 4, 'transformation', $$Turn into a question: "They live near the market."$$, null, $$Do they live near the market?$$, $$Câu hỏi thì hiện tại đơn với chủ ngữ số nhiều "they" bắt đầu bằng "Do": Do they live near the market?$$),

  -- Unit 2: Present Continuous
  (2, 1, 'fill_blank', $$Please be quiet, the baby ___ (sleep).$$, null, $$is sleeping$$, $$Hành động đang diễn ra ngay lúc nói dùng hiện tại tiếp diễn: is + sleeping.$$),
  (2, 2, 'multiple_choice', $$Which sentence describes something happening right now?$$, $$["I work in the city.", "I am working from home this week.", "I worked all weekend.", "I have worked here for years."]$$, $$I am working from home this week.$$, $$"This week" và cấu trúc "am + V-ing" cho thấy đây là tình huống tạm thời, đang diễn ra.$$),
  (2, 3, 'error_spotting', $$They is watching a movie right now.$$, null, $$is$$, $$Chủ ngữ "they" là số nhiều nên phải dùng "are", không phải "is": They are watching a movie.$$),
  (2, 4, 'transformation', $$Turn into the negative: "He is studying for the exam."$$, null, $$He isn't studying for the exam.$$, $$Phủ định của hiện tại tiếp diễn: is -> isn't. He isn't studying for the exam.$$),

  -- Unit 3: Past Simple
  (3, 1, 'fill_blank', $$We ___ (go) to the beach last summer.$$, null, $$went$$, $$"Go" là động từ bất quy tắc, dạng quá khứ là "went": We went to the beach.$$),
  (3, 2, 'multiple_choice', $$Choose the correct past simple form of "study".$$, $$["studyed", "studied", "studies", "studying"]$$, $$studied$$, $$Động từ tận cùng bằng phụ âm + y, đổi y thành i rồi thêm -ed: study -> studied.$$),
  (3, 3, 'error_spotting', $$She didn't went to work yesterday.$$, null, $$went$$, $$Sau "didn't" luôn dùng động từ nguyên mẫu, không chia quá khứ: She didn't go to work.$$),
  (3, 4, 'transformation', $$Turn into a question: "He called his mother."$$, null, $$Did he call his mother?$$, $$Câu hỏi quá khứ đơn dùng "Did" + chủ ngữ + động từ nguyên mẫu: Did he call his mother?$$),

  -- Unit 4: Countable & Uncountable Nouns
  (4, 1, 'fill_blank', $$Can you give me ___ advice about this problem?$$, null, $$some$$, $$"Advice" là danh từ không đếm được, không dùng "a/an", thường đi với "some" hoặc "any".$$),
  (4, 2, 'multiple_choice', $$Which sentence is correct?$$, $$["I need an information.", "I need some information.", "I need a informations.", "I need informations."]$$, $$I need some information.$$, $$"Information" không đếm được: không có dạng số nhiều và không dùng "a/an", dùng "some" thay thế.$$),
  (4, 3, 'error_spotting', $$She bought a new furnitures for her room.$$, null, $$furnitures$$, $$"Furniture" là danh từ không đếm được, không có dạng số nhiều: a new piece of furniture / some new furniture.$$),
  (4, 4, 'transformation', $$Rewrite using "the": "I saw ___ dog. ___ dog was very friendly." (second mention)$$, null, $$I saw a dog. The dog was very friendly.$$, $$Lần đầu nhắc tới dùng "a" (chưa xác định), lần thứ hai dùng "the" vì người nghe đã biết con chó nào.$$),

  -- Unit 5: Past Continuous
  (5, 1, 'fill_blank', $$I ___ (cook) dinner when the phone rang.$$, null, $$was cooking$$, $$Hành động nền đang diễn ra thì bị hành động khác xen vào, dùng quá khứ tiếp diễn: was cooking.$$),
  (5, 2, 'multiple_choice', $$Choose the correct sentence.$$, $$["While I studying, she called.", "While I was studying, she called.", "While I studied, she was calling.", "While I am studying, she called."]$$, $$While I was studying, she called.$$, $$Hành động nền dùng quá khứ tiếp diễn (was studying), hành động ngắn xen vào dùng quá khứ đơn (called).$$),
  (5, 3, 'error_spotting', $$They were watch TV when I arrived.$$, null, $$watch$$, $$Sau "were" trong thì quá khứ tiếp diễn phải dùng V-ing: were watching.$$),
  (5, 4, 'transformation', $$Combine: "I was walking home. + I saw an old friend." (use "when")$$, null, $$I was walking home when I saw an old friend.$$, $$Hành động nền (was walking) kết hợp với hành động ngắn xen vào (saw) bằng "when".$$),

  -- Unit 6: Present Perfect
  (6, 1, 'fill_blank', $$She ___ (already/finish) her homework.$$, null, $$has already finished$$, $$"Already" thường đi kèm hiện tại hoàn thành: has already finished.$$),
  (6, 2, 'multiple_choice', $$Which sentence is correct?$$, $$["I have seen that movie last week.", "I saw that movie last week.", "I have see that movie last week.", "I seen that movie last week."]$$, $$I saw that movie last week.$$, $$"Last week" là mốc thời gian cụ thể đã kết thúc nên dùng quá khứ đơn, không dùng hiện tại hoàn thành.$$),
  (6, 3, 'error_spotting', $$Have you ever went to Japan?$$, null, $$went$$, $$Sau "have/has" phải dùng phân từ hai (past participle): Have you ever been to Japan?$$),
  (6, 4, 'transformation', $$Turn into the negative: "We have finished the project."$$, null, $$We haven't finished the project.$$, $$Phủ định của hiện tại hoàn thành: have -> haven't. We haven't finished the project.$$),

  -- Unit 7: Future (will vs going to)
  (7, 1, 'fill_blank', $$Look at those dark clouds! It ___ (rain).$$, null, $$is going to rain$$, $$Có bằng chứng rõ ràng ngay trước mắt (dark clouds) nên dùng "going to", không dùng "will".$$),
  (7, 2, 'multiple_choice', $$Choose the best response to "The phone is ringing."$$, $$["I am going to answer it.", "I will answer it.", "I answer it.", "I am answering it tomorrow."]$$, $$I will answer it.$$, $$Quyết định đưa ra ngay lúc nói dùng "will", không phải một kế hoạch đã định trước.$$),
  (7, 3, 'error_spotting', $$We will going to visit them next month.$$, null, $$will going$$, $$Không kết hợp "will" với "going to"; chọn một trong hai: We are going to visit them next month.$$),
  (7, 4, 'transformation', $$Rewrite as a planned decision: "We will travel to Hue next year." (use "going to")$$, null, $$We are going to travel to Hue next year.$$, $$Một kế hoạch đã quyết định từ trước diễn đạt bằng "be going to" thay vì "will".$$),

  -- Unit 8: Modals can/could/should
  (8, 1, 'fill_blank', $$You look tired. You ___ (should) get some rest.$$, null, $$should$$, $$Lời khuyên dùng "should": You should get some rest.$$),
  (8, 2, 'multiple_choice', $$Which sentence talks about a past ability?$$, $$["She can play the piano.", "She could play the piano when she was six.", "She should play the piano.", "She will play the piano."]$$, $$She could play the piano when she was six.$$, $$"Could" diễn tả khả năng trong quá khứ, kết hợp với mốc thời gian quá khứ "when she was six".$$),
  (8, 3, 'error_spotting', $$You should to see a doctor about that cough.$$, null, $$to see$$, $$Sau động từ khuyết thiếu "should" dùng động từ nguyên mẫu không "to": You should see a doctor.$$),
  (8, 4, 'transformation', $$Turn into a polite request: "Help me carry this bag." (use "could")$$, null, $$Could you help me carry this bag?$$, $$"Could you...?" là cách hỏi lịch sự hơn so với câu mệnh lệnh trực tiếp.$$),

  -- Unit 9: Modals must/have to
  (9, 1, 'fill_blank', $$Employees ___ (have to) wear a helmet on site; it's the law.$$, null, $$have to$$, $$Quy định bắt buộc từ bên ngoài (luật) dùng "have to": Employees have to wear a helmet.$$),
  (9, 2, 'multiple_choice', $$Which sentence means "it is not necessary"?$$, $$["You must not smoke here.", "You don't have to pay for parking today.", "You have to pay for parking today.", "You must pay for parking today."]$$, $$You don't have to pay for parking today.$$, $$"Don't have to" nghĩa là không bắt buộc, khác với "must not" (bị cấm).$$),
  (9, 3, 'error_spotting', $$You mustn't to park in front of the entrance.$$, null, $$to park$$, $$Sau "mustn't" dùng động từ nguyên mẫu không "to": You mustn't park in front of the entrance.$$),
  (9, 4, 'transformation', $$Rewrite using "must not": "It is forbidden to take photos here."$$, null, $$You must not take photos here.$$, $$"Must not" diễn tả điều bị cấm, tương đương với "it is forbidden to...".$$),

  -- Unit 10: Zero & First Conditional
  (10, 1, 'fill_blank', $$If you heat ice, it ___ (melt).$$, null, $$melts$$, $$Sự thật hiển nhiên dùng câu điều kiện loại 0: hiện tại đơn ở cả hai vế. If you heat ice, it melts.$$),
  (10, 2, 'multiple_choice', $$Choose the correct first conditional sentence.$$, $$["If it rains tomorrow, we stay home.", "If it rains tomorrow, we will stay home.", "If it will rain tomorrow, we stay home.", "If it rained tomorrow, we will stay home."]$$, $$If it rains tomorrow, we will stay home.$$, $$Câu điều kiện loại 1: If + hiện tại đơn, will + động từ nguyên mẫu.$$),
  (10, 3, 'error_spotting', $$If you will heat water to 100 degrees, it boils.$$, null, $$will heat$$, $$Mệnh đề "if" trong câu điều kiện loại 0 và loại 1 không dùng "will", chỉ dùng hiện tại đơn: If you heat water.$$),
  (10, 4, 'transformation', $$Combine using a first conditional: "You study hard. + You will pass the exam."$$, null, $$If you study hard, you will pass the exam.$$, $$Điều kiện có khả năng xảy ra ở tương lai: If + hiện tại đơn, will + động từ nguyên mẫu.$$)
) as x(order_index, position, exercise_type, prompt, choices, correct_answer, explanation_vi)
  on x.order_index = u.order_index
on conflict do nothing;
