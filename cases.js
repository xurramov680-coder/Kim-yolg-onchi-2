// t = title, s = story, h = 4 consistent clues for the honest players,
// l = the liar's clue (it contradicts one honest clue: the hidden contradiction).
// Add more objects in the same shape to grow the pool.
module.exports = [
  { t: "The Missing Diamond", s: "A diamond vanished from Room 12 of Hotel Aurora at 22:00.",
    h: ["The corridor lights went out at 21:55.", "The room door was unlocked, not forced.", "The staff elevator was used at 22:05.", "The thief wore a green uniform sleeve."],
    l: "The corridor lights stayed on all evening." },
  { t: "The Stolen Painting", s: "A painting disappeared from the city museum at 20:30.",
    h: ["The alarm was switched off from inside at 20:25.", "The frame was left behind, the canvas cut cleanly.", "Only the east door camera was off.", "A cleaning cart blocked the west hall."],
    l: "The alarm rang loudly at 20:30." },
  { t: "The Missing Phone", s: "A phone vanished from Table 7 at Luna Restaurant at 19:15.",
    h: ["The phone was on the table at 19:10.", "A waiter refilled the water at 19:12.", "The lights dimmed at 19:14 for a birthday cake.", "A red napkin covered the spot where the phone lay."],
    l: "The phone never left its owner's pocket." },
  { t: "The School Mystery", s: "The final exam papers vanished from the school office before 08:00.",
    h: ["The office key was signed out at 07:15.", "The cabinet lock was picked, not broken.", "The cleaner left the building at 06:50.", "A blue folder was seen in the gym."],
    l: "The cabinet was smashed open with a hammer." },
  { t: "The Locked Room", s: "The safe in a locked study was emptied at midnight.",
    h: ["The study door was locked from the outside.", "Only one spare key exists.", "The window latch was closed from inside.", "Fresh mud lay on the study carpet."],
    l: "The study window was wide open." },
  { t: "The Lost Wallet", s: "A wallet disappeared from a station bench at 17:40.",
    h: ["The 17:35 train had just left.", "A man in a gray coat sat on that bench.", "The bench stands next to the ticket machine.", "A coat button was found nearby."],
    l: "No train ran between 17:00 and 18:00." },
  { t: "The Secret Laboratory", s: "A sample vanished from a lab freezer at 03:00.",
    h: ["Badge logs show an entry at 02:50.", "The freezer alarm was muted.", "The cameras worked but pointed at the floor.", "A single glove was left in the sink."],
    l: "Nobody entered the lab after 22:00." },
  { t: "The Fake Alibi", s: "A necklace was stolen from the mansion during the 21:00 dinner.",
    h: ["The host left the table at 21:10 for a call.", "The necklace case was empty at 21:20.", "Dinner ran late, ending at 22:00.", "A phone rang during dessert."],
    l: "The host never left the table." }
];
