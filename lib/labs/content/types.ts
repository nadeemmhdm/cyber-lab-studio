export type EducationalCommand = {
  command: string;
  purpose: string;
  explanation: string;
};

export type EducationalTask = {
  position: number;
  title: string;
  instruction: string;
  validatorKey: string;
};

export type LabEducationalContent = {
  number: number;
  conceptExplanation: string;
  scenario: string;
  prerequisites: string[];
  tasks: EducationalTask[];
  hints: [string, string, string];
  solution: {
    problem: string;
    concept: string;
    uiNavigation: string;
    commands: EducationalCommand[];
    expectedOutput: string;
    whyItWorks: string;
    securityConsequence: string;
    verification: string;
    commonMistakes: string;
    troubleshooting: string;
    summary: string;
  };
};

export type LabContentSeed = {
  number: number;
  focus: string;
  scenario: string;
  investigate: string;
  action: string;
  verify: string;
  expected: string;
  consequence: string;
  mistakes: string;
  troubleshooting: string;
  commands: EducationalCommand[];
  prerequisites?: string[];
};
