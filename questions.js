/**
 * Liva AI — Writing savollar bazasi.
 * task11, task12, part2 — alohida massivlar.
 * Task 1.1 va 1.2: canteenContext + prompt obyektlari.
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

  window.LIVA_WRITING_QUESTIONS = {
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
})();
