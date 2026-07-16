// Seed guestbook entries. Purely decorative — there is no backend. New
// signatures are added client-side and vanish on reload (it's 1996).

export interface GuestbookEntry {
  name: string;
  location: string;
  date: string; // display string, period-correct
  message: string;
}

export const guestbookSeed: GuestbookEntry[] = [
  {
    name: 'webmaster',
    location: 'boring-phone.co',
    date: 'Oct 31, 1996',
    message:
      "Thanks for visiting my homepage! Don't forget to bookmark it and tell a friend. Sign below! ~ your webmaster",
  },
  {
    name: 'NetSurfer_88',
    location: 'Sacramento, CA',
    date: 'Nov 2, 1996',
    message:
      'wow a website that loads FAST!! no wonder, its BORING lol. bookmarked!! 📎',
  },
  {
    name: 'Cheryl_from_HR',
    location: 'Cubicle 4B',
    date: 'Dec 20, 1996',
    message:
      'I turned my screen gray like step #2 said. my productivity is up like 300%. the boss noticed. thank u!!!',
  },
  {
    name: 'dialup_dan',
    location: 'the basement',
    date: 'Jan 14, 1997',
    message: 'my mom needs the phone line back so gtg. rad site tho 📞 A/S/L?',
  },
  {
    name: 'xX_grunge_Xx',
    location: 'Seattle, WA',
    date: 'Mar 3, 1997',
    message:
      'unplugged for 2 weeks like the RCT. touched grass. can confirm it works. 🌱 no thoughts head empty (in a good way)',
  },
];
