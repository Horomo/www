export type LearnGuide = {
  slug: string;
  href: string;
  title: string;
  description: string;
  excerpt: string;
  keywords: string[];
  datePublished: string;
  dateModified: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
  }>;
};

export const learnGuides: LearnGuide[] = [
  {
    slug: 'what-is-ba-zi',
    href: '/learn/what-is-ba-zi',
    title: 'What Is BaZi? A Clear Introduction to the Four Pillars Chart',
    description:
      'Learn what a BaZi chart is, how the Four Pillars work, and why birth time, Day Master, hidden stems, and luck pillars matter in Chinese astrology.',
    excerpt:
      'A practical introduction to the Four Pillars chart, including the year, month, day, and hour pillars and the role of true solar time.',
    keywords: ['what is ba zi', 'bazi chart', 'four pillars chart', 'chinese astrology calculator'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'What a BaZi chart measures',
        paragraphs: [
          'BaZi, or the Four Pillars of Destiny, is a charting system that maps your birth year, month, day, and hour into four stem-and-branch pillars. Each pillar carries elemental and yin-yang qualities that practitioners use to study personality patterns, timing, and recurring life themes.',
          'A good BaZi calculator does more than convert a birth date into symbols. It also handles timezone logic, daylight saving time, and solar timing details so the pillar calculation stays accurate around boundary cases.',
        ],
        bullets: [
          'Year pillar: broad family, ancestry, and early environment context.',
          'Month pillar: seasonal influence, work style, and the chart climate around the Day Master.',
          'Day pillar: the Day Master and close personal orientation.',
          'Hour pillar: later expression, goals, and finer timing layers when birth time is known.',
        ],
      },
      {
        heading: 'Why birth time and true solar time matter',
        paragraphs: [
          'Many people search for a BaZi calculator expecting the same answer from every tool, but that only happens when the underlying time handling is correct. If birth time lands close to a pillar boundary, a timezone or daylight saving adjustment can move the chart into a different hour or even a different day pillar.',
          'Horomo uses true solar time adjustments so the clock time on a birth certificate is corrected with the local timezone, daylight saving rules, longitude correction, and equation of time. That makes the calculator more reliable for real-world chart work.',
        ],
      },
      {
        heading: 'How to read the result after calculation',
        paragraphs: [
          'Start with the Day Master because it anchors the rest of the interpretation. Then review visible stems, hidden stems inside the branches, the Ten Gods relative to the Day Master, and the overall element distribution across the chart.',
          'Luck pillars, also called Da Yun, add the timing layer. They show how major ten-year cycles interact with the natal chart, helping you frame life periods rather than isolated events.',
        ],
      },
    ],
  },
  {
    slug: 'day-master',
    href: '/learn/day-master',
    title: 'Day Master Explained: The Core Reference Point in a BaZi Reading',
    description:
      'Learn what the Day Master means in BaZi, how to identify it, and how it shapes the reading of Ten Gods, element relationships, and chart themes.',
    excerpt:
      'The Day Master is the stem of the day pillar and the main reference point for reading Ten Gods and element relationships in a chart.',
    keywords: ['day master', 'bazi reading', 'day master explained', 'four pillars calculator'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'What the Day Master is',
        paragraphs: [
          'The Day Master is the heavenly stem sitting on the day pillar. In practice, it acts as the chart’s reference point. When a BaZi reading talks about output, wealth, resource, influence, or companions, those labels are being defined in relation to the Day Master.',
          'Because the Day Master is relational, it should not be read in isolation. The stem itself matters, but the surrounding branches, hidden stems, seasonal context, and timing cycles shape how that stem behaves in the full chart.',
        ],
      },
      {
        heading: 'Why the Day Master matters so much',
        paragraphs: [
          'Two charts can contain similar elemental totals and still read differently if the Day Masters differ. The same visible stem can represent support in one chart and control in another because the relationship changes with the Day Master.',
        ],
        bullets: [
          'It determines the Ten Gods mapping.',
          'It helps frame personality tendencies and operating style.',
          'It makes the element distribution interpretable instead of generic.',
          'It is essential for reading luck pillars in context.',
        ],
      },
      {
        heading: 'How to use it well',
        paragraphs: [
          'A useful Day Master reading connects the stem to visible chart evidence. If you see strong output themes in the chart, explain which stems or hidden stems create that pattern. If resource appears often, show where it appears instead of repeating stock personality statements.',
          'This is why Horomo shows the Day Master, Ten Gods, hidden stems, and chart distribution together. It keeps the interpretation tied to the actual structure of the chart.',
        ],
      },
    ],
  },
  {
    slug: 'ten-gods',
    href: '/learn/ten-gods',
    title: 'Ten Gods in BaZi: How Relative Roles Are Read from the Day Master',
    description:
      'Understand the Ten Gods in BaZi, including companion, output, wealth, influence, and resource roles, and how they are derived from the Day Master.',
    excerpt:
      'The Ten Gods are relational labels that describe how other stems behave relative to the Day Master across companionship, expression, wealth, authority, and resource themes.',
    keywords: ['ten gods', 'ten gods bazi', 'bazi reading', 'day master'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'What the Ten Gods represent',
        paragraphs: [
          'The Ten Gods are not ten separate planets or objects. They are ten relationship patterns created by comparing another stem to the Day Master through element and polarity rules. In other words, they are a language for describing function inside the chart.',
        ],
        bullets: [
          'Companion: peer energy, allies, sameness, and competition.',
          'Output: expression, ideas, delivery, teaching, and creation.',
          'Wealth: management of resources, business, exchange, and practical gain.',
          'Influence: structure, responsibility, pressure, standards, and accountability.',
          'Resource: learning, support, intake, protection, and recovery.',
        ],
      },
      {
        heading: 'Why counts alone are not enough',
        paragraphs: [
          'People often search for a Ten Gods chart and assume the highest count automatically defines the person. That is too simple. Counts are useful for pattern recognition, but interpretation still depends on where those stems appear, whether they are visible or hidden, and what timing cycles activate them.',
          'Horomo exposes flat counts across visible stems and hidden stems to make patterns easier to discover, but the page keeps the underlying chart visible so you can see where the pattern comes from.',
        ],
      },
      {
        heading: 'How to read Ten Gods more accurately',
        paragraphs: [
          'Start by identifying the Day Master. Then note which Ten Gods show up repeatedly in visible stems, which appear mainly through hidden stems, and which show up in the current or upcoming luck pillars. This moves the reading from a static label toward a usable chart interpretation.',
        ],
      },
    ],
  },
  {
    slug: 'hidden-stems',
    href: '/learn/hidden-stems',
    title: 'Hidden Stems Explained: What Sits Inside the Earthly Branches',
    description:
      'Learn what hidden stems are in BaZi, why they matter in chart interpretation, and how they affect Ten Gods, element distribution, and pattern recognition.',
    excerpt:
      'Hidden stems are the elemental layers contained inside each earthly branch, and they often explain chart themes that visible stems alone miss.',
    keywords: ['hidden stems', 'hidden stems explained', 'bazi chart', 'ten gods'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'Why hidden stems matter',
        paragraphs: [
          'If you only read the visible heavenly stems, you miss a large part of the chart. Each earthly branch contains hidden stems, and those hidden stems affect the element mix and the relative Ten Gods structure.',
          'That is why a BaZi chart can look simple on the surface but feel more complex in practice. Some themes sit underneath the visible layer and only become obvious when hidden stems are counted or activated by timing.',
        ],
      },
      {
        heading: 'What hidden stems change in the reading',
        paragraphs: [
          'Hidden stems can change your sense of which elements are frequent, which Ten Gods repeat, and which life themes are quietly present even if they are not dominant in the visible stems.',
        ],
        bullets: [
          'They add depth to element distribution.',
          'They reveal supportive or conflicting sub-patterns.',
          'They help explain why two similar-looking charts can behave differently.',
          'They matter when checking which themes become more active during luck pillars.',
        ],
      },
      {
        heading: 'How Horomo handles them',
        paragraphs: [
          'Horomo keeps the visible chart readable but also counts all hidden stems in the chart analytics. That means the element and Ten Gods summaries reflect the full branch content instead of only the surface layer.',
          'For learning, it helps to compare the visible stem table with the chart summaries and notice which recurring themes come mostly from hidden stems.',
        ],
      },
    ],
  },
  {
    slug: 'element-distribution',
    href: '/learn/element-distribution',
    title: 'Element Distribution in BaZi: How to Read the Five Elements Across a Chart',
    description:
      'Learn how element distribution works in BaZi, what the five elements reveal in a chart, and how visible stems, hidden stems, and timing cycles change the picture.',
    excerpt:
      'Element distribution shows how wood, fire, earth, metal, and water appear across the chart, but the count only becomes useful when paired with the Day Master and chart structure.',
    keywords: ['element distribution', 'five elements bazi', 'bazi chart', 'hidden stems'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'What element distribution can tell you',
        paragraphs: [
          'Element distribution is a way to summarize how often wood, fire, earth, metal, and water appear across visible stems and hidden stems. It can help you spot recurring patterns quickly, especially when you compare the summary against the Day Master.',
          'On its own, however, an element count should not be treated as a final verdict. The same total can mean different things depending on where those elements appear and how they relate to the Day Master.',
        ],
      },
      {
        heading: 'How to avoid oversimplifying the chart',
        paragraphs: [
          'A good chart reading uses element distribution as a map, not as the whole territory. It should connect the count back to the actual pillars, visible stems, hidden stems, and Ten Gods structure.',
        ],
        bullets: [
          'Check whether the element appears in visible stems, hidden stems, or both.',
          'Look at which chart roles the element creates relative to the Day Master.',
          'Notice whether a luck pillar repeats or shifts the pattern.',
          'Use the summary to guide interpretation, not replace it.',
        ],
      },
      {
        heading: 'Why this matters for calculators',
        paragraphs: [
          'Many people search for an element distribution calculator because they want a quick overview before diving deeper. Horomo makes that useful by combining the summary with the underlying chart tables and Ten Gods distribution, so the result remains interpretable instead of generic.',
        ],
      },
    ],
  },
  {
    slug: 'luck-pillars',
    href: '/learn/luck-pillars',
    title: 'Luck Pillars and Da Yun: How Ten-Year Cycles Work in BaZi',
    description:
      'Understand how luck pillars, also called Da Yun, are calculated in BaZi and how they interact with the natal chart to frame major life periods.',
    excerpt:
      'Luck pillars are ten-year timing cycles that extend the natal chart and help frame broader life periods, directional shifts, and recurring themes.',
    keywords: ['luck pillars', 'da yun', 'major luck cycles', 'bazi reading'],
    datePublished: '2026-04-05',
    dateModified: '2026-04-05',
    sections: [
      {
        heading: 'What luck pillars are',
        paragraphs: [
          'Luck pillars, or Da Yun, are ten-year cycles derived from the natal chart and the birth timing rules. They do not replace the birth chart. Instead, they act as a timing layer that shows which stem-and-branch environment is active during a given decade.',
          'In practical reading, they help explain why certain themes feel more prominent at different stages of life, even though the natal chart remains the foundation.',
        ],
      },
      {
        heading: 'Why direction and start age matter',
        paragraphs: [
          'Da Yun is not just a list of future pillars. The direction of progression and the age when the first pillar begins are part of the calculation. Those details depend on classical rules tied to the chart and birth data.',
          'That is why Horomo asks for the luck cycle direction setting and shows the start age together with the nearest solar term context.',
        ],
      },
      {
        heading: 'How to read luck pillars well',
        paragraphs: [
          'Read a luck pillar by comparing it to the natal chart. Look at which elements and Ten Gods the cycle adds, which natal themes it repeats, and whether it activates something that was previously hidden or secondary.',
        ],
        bullets: [
          'Use the natal chart first, then layer the Da Yun on top.',
          'Check how the cycle relates to the Day Master.',
          'Notice whether the cycle reinforces output, resource, wealth, influence, or companion patterns.',
          'Treat a luck pillar as context for a life period, not as a single-event prediction.',
        ],
      },
    ],
  },
];

export function getLearnGuide(slug: string): LearnGuide | undefined {
  return learnGuides.find((guide) => guide.slug === slug);
}
