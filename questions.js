/**
 * Silva AI — Writing va Speaking savollar bazasi.
 * Writing: `tests` — har biri to‘liq mini-test (kontekst + Task 1.1 / 1.2 / Part 2). writing.html tasodifiy bittasini tanlaydi.
 * Speaking: SILVA_SPEAKING_QUESTIONS (imgUrl/imgUrls; vocabularyWords; part3: Argument Helper / jadval).
 */
(function () {
  var CANTEEN_CONTEXT =
    "You are a student at your school, and the canteen manager sent you this message:\n\n" +
    "Dear Student,\n\n" +
    "We are planning to make some improvements in our school canteen and would like to hear your suggestions. " +
    "What new meals or snacks would you like us to include? What facilities or seating areas should we improve? " +
    "What events could we organize to make lunchtimes more enjoyable?\n\n" +
    "Best wishes,\n" +
    "The Canteen Manager";

  /** @type {Array<{ id: string, title: string, canteenContext: string, task11: Array<{ prompt: string }>, task12: Array<{ prompt: string }>, part2: Array<{ prompt: string }> }>} */
  var WRITING_TESTS = [
    {
      id: "test-2-city-library",
      title: "Test 2 – City Library",
      canteenContext:
        "Dear Member,\n\n" +
        "We are planning to make some improvements in our library and would like to hear your suggestions. " +
        "What new books or sections would you like to add? What services should we improve? " +
        "What events could we organize for our readers?\n\n" +
        "Best wishes,\n" +
        "The Librarian.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your friend who also visits the library. " +
            "Tell them about the message and ask what new books, services, or events they would suggest. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the librarian. " +
            "Give your suggestions about new books, services, and events that could improve the library. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Should people read printed books or e-books? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
    {
      id: "test-3-fitness-club",
      title: "Test 3 – Fitness Club",
      canteenContext:
        "Dear Member,\n\n" +
        "We are planning to improve our fitness club and would like to hear your suggestions. " +
        "What new classes would you like us to offer? What facilities or equipment should we improve? " +
        "What events could we organize for members to stay motivated?\n\n" +
        "Best wishes,\n" +
        "The Manager.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your friend who also attends the fitness club. " +
            "Tell them about the message and ask what new classes, equipment, or events they would suggest. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the club manager. " +
            "Give your suggestions about new classes, better equipment, and events that could motivate members. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Should young people spend more time on exercise or studying? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
    {
      id: "test-4-city-park",
      title: "Test 4 – City Park",
      canteenContext:
        "Dear Resident,\n\n" +
        "We are planning to renovate our city park and would like to hear your suggestions. " +
        "What new facilities would you like us to add? What areas should we improve or redesign? " +
        "What community events could we organize for visitors?\n\n" +
        "Best wishes,\n" +
        "The Park Manager.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your neighbour. " +
            "Tell them about the message and ask what new facilities or events they would suggest. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the park manager. " +
            "Give your suggestions about new facilities, improvements, and events for the park. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Should local governments spend more money on parks or on public transport? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
    {
      id: "test-5-school-sports-day",
      title: "Test 5 – School Sports Day",
      canteenContext:
        "Dear Student,\n\n" +
        "We are planning our annual School Sports Day and would like your input. " +
        "What sports or activities should we include? What prizes or awards should we give? " +
        "What can we do to make the event more exciting?\n\n" +
        "Best wishes,\n" +
        "The Sports Coordinator.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your classmate. " +
            "Tell them about the message and ask what sports or ideas they would suggest. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the sports coordinator. " +
            "Give your suggestions about activities, awards, and ways to make the event more exciting. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Is competition important for students? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
    {
      id: "test-6-cafe",
      title: "Test 6 – Café",
      canteenContext:
        "Dear Customer,\n\n" +
        "We are planning to improve our café and would like to hear your suggestions. " +
        "What new dishes or drinks should we add to the menu? What facilities or seating areas should we improve? " +
        "What special events could we organize for regular customers?\n\n" +
        "Best wishes,\n" +
        "The Café Owner.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your friend who also visits the café. " +
            "Tell them about the message and ask what new dishes, facilities, or events they would like. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the café owner. " +
            "Give your suggestions about new dishes, improved services, and special events. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Do small cafés have more loyal customers than big chains? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
    {
      id: "test-7-modernizing-library",
      title: "Test 7 – Modernizing Library",
      canteenContext:
        "Dear Student,\n\n" +
        "We are planning to modernize our school library and would like your suggestions. " +
        "What digital resources or tools should we introduce? What areas of the library should we redesign? " +
        "What events could encourage students to read more?\n\n" +
        "Best wishes,\n" +
        "The Librarian.",
      task11: [
        {
          prompt:
            "Task 1.1: Write a short email to your classmate. " +
            "Tell them about the message and ask what digital tools or ideas they would recommend. (50 words)",
        },
      ],
      task12: [
        {
          prompt:
            "Task 1.2: Write an email to the librarian. " +
            "Give your suggestions about digital resources, design changes, and reading events. (120–150 words)",
        },
      ],
      part2: [
        {
          prompt:
            "Part 2: Should schools replace traditional libraries with digital ones? " +
            "Post your response, giving reasons and examples. (180–200 words)",
        },
      ],
    },
  ];

  window.SILVA_WRITING_QUESTIONS = {
    /** To‘liq testlar ro‘yxati — har safar bittasi tasodifiy tanlanadi (yangi mavzu / sahifa yangilanganda). */
    tests: WRITING_TESTS,

    /** Zaxira: tests bo‘sh bo‘lsa ishlatiladi */
    canteenContext: CANTEEN_CONTEXT,

    task11: [
      {
        prompt:
          "Task 1.1 (Short Email):\n\n" +
          "Vazifa: Write a short email to your classmate. Tell them about the message and ask what new meals, facilities, or events they think would make the canteen better.\n\n" +
          "Limit: Write about 50 words.",
      },
    ],

    task12: [
      {
        prompt:
          "Task 1.2 (Formal Email):\n\n" +
          "Vazifa: Write an email to the canteen manager. Give your suggestions about new meals, improved facilities, and events that could make the canteen more enjoyable for students.\n\n" +
          "Limit: Write 120-150 words.",
      },
    ],

    part2: [
      {
        prompt:
          "Part 2 (Online Discussion):\n\n" +
          "Vazifa: You are participating in an online discussion for students. The question is: Should schools ban junk food completely? Post your response, giving reasons and examples.\n\n" +
          "Limit: Write 180-200 words.",
      },
    ],
  };

  /**
   * Speaking — multi-level savollar (speaking.html).
   * Day 7: Part 1.2 assets/day7/ (car vs bus); part3.argumentHelperLabel (masalan Argument Helper).
   */
  window.SILVA_SPEAKING_QUESTIONS = {
    dayTitle: "Silva AI Speaking: Day 7 (Test 7)",

    part11: [
      { tag: "Pets", question: "Do you have a pet?" },
      { tag: "Reading", question: "How often do you read books?" },
      { tag: "Cinema", question: "Who is your favourite actor or actress?" },
    ],

    part12: [
      {
        tag: "Transport · Pictures",
        question: "What do you see in these pictures?",
        imgUrls: ["assets/day7/part12-car.png", "assets/day7/part12-bus.png"],
        imageCaptions: ["Haydovchi xursand holda avtomobil boshqarmoqda", "Yo‘lovchilar avtobusda safarda"],
        vocabularyWords: [
          "Cheerful",
          "Grip",
          "Journey",
          "Passenger",
          "Diverse",
          "Economical",
          "Environmentally friendly",
        ],
      },
      {
        tag: "Advantages",
        question: "What are the advantages of taking a bus instead of a taxi?",
      },
      {
        tag: "Preference",
        question: "Do you prefer to travel by bus or by taxi?",
      },
    ],

    part2: {
      imgUrl: "assets/day7/part2-significant-change.png",
      title: "Significant Change",
      caption: "Topic · Significant Change · Day 7",
      bullets: [
        "Describe a time in your life when you experienced a significant change.",
        "How has this change affected your personal growth or outlook on life?",
        "Why do you think people sometimes struggle with change?",
      ],
    },

    part3: {
      topicLabel: "Part 3 · Discussion",
      question: "Sports teams should be allowed to pay players based on their performance.",
      argumentHelperLabel: "Argument Helper",
      helperNote:
        "Performance-based pay mavzusi uchun quyidagi jadvaldan foydalaning: har bir qatorda FOR va AGAINST fikrlarni solishtiring va o‘z pozitsiyangizni asoslang.",
      columnLabels: {
        forCol: "Rozilar (FOR)",
        againstCol: "Qarshilar (AGAINST)",
      },
      pointsFor: [
        "Encourages athletes to give their best and improves team performance.",
        "Rewards hard work and skill in a transparent way.",
        "Makes teams more competitive and financially efficient.",
      ],
      pointsAgainst: [
        "May lead to unhealthy competition and pressure on players.",
        "Cause inequality within teams (some positions have fewer chances to shine).",
        "Players might focus on individual success rather than team cooperation.",
      ],
    },
  };
})();
