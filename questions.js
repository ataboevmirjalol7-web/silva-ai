/**
 * Silva AI — Writing va Speaking savollar bazasi.
 * Writing: task11, task12, part2 — alohida massivlar.
 * Speaking: SILVA_SPEAKING_QUESTIONS (speaking.html, imgUrl ixtiyoriy).
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

  window.SILVA_WRITING_QUESTIONS = {
    /** Task 1.1 va 1.2 uchun umumiy xabar (Topic Generator: Context bloki) */
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
   * imgUrl: ixtiyoriy; bo‘lsa, savol matnidan oldin rasm ko‘rsatiladi.
   */
  window.SILVA_SPEAKING_QUESTIONS = {
    part11: [
      { tag: "Online Shopping", question: "Have you ever bought clothes online?" },
      { tag: "Colors", question: "What is your favorite color?" },
      { tag: "Technology", question: "Do you use computers?" },
    ],

    part12: [
      {
        tag: "Image Analysis",
        question:
          "What do you see in these pictures? (Comparing office work vs. working from home with a child).",
        imgUrl: "assets/office-home.jpg",
      },
      {
        tag: "Opinion",
        question:
          "Which do you think is better for working in teams: working in an office or from home?",
      },
      {
        tag: "Economics",
        question: "Do you think companies save money if employees work from home?",
      },
    ],

    part2: {
      imgUrl: "assets/ambition.jpg",
      title: "Ambition",
      caption: "Topic · Ambition",
      bullets: [
        "Tell me about a time when you pursued an ambitious goal.",
        "How did this experience change your understanding of ambition?",
        "What impact does ambition have on people’s lives and society as a whole?",
      ],
    },

    part3: {
      topicLabel: "Topic · Renewable Energy",
      question: "Should countries invest more in renewable energy sources?",
      pointsFor: [
        "Reduces dependence on fossil fuels",
        "Long-term economic benefits",
        "Cost-effective and efficient",
      ],
      pointsAgainst: [
        "Expensive initial investment",
        "Weather-dependent and unreliable",
        "Challenging to transition without disrupting economies",
      ],
    },
  };
})();
