import fs from 'fs';
import path from 'path';

const formBuilderPath = path.join(process.cwd(), 'src/backend/modules/offerings/google-forms/form-builder.ts');
let content = fs.readFileSync(formBuilderPath, 'utf-8');

// 1. Add CareerInfo interface and remove CAREER_OPTIONS / CAREER_SCHOOL_MAP
content = content.replace(
  /export const CAREER_OPTIONS = \[[\s\S]*?\] as const;/g,
  `export interface CareerInfo {
  name: string;
  schoolName: string;
}`
);

content = content.replace(
  /const CAREER_SCHOOL_MAP: Record<string, string> = {[\s\S]*?};/g,
  ``
);

// 2. Update buildPhase1Requests signature and logic
content = content.replace(
  /export function buildPhase1Requests\(careerGroups: CareerOfferingGroup\[\]\): unknown\[\] \{/,
  `export function buildPhase1Requests(careerGroups: CareerOfferingGroup[], allCareers: CareerInfo[]): unknown[] {`
);

content = content.replace(
  /options: CAREER_OPTIONS\.map\(\(career\) => \(\{ value: career \}\)\),/g,
  `options: allCareers.map((career) => ({ value: career.name })),`
);

content = content.replace(
  /const getSchoolTitle = \(careerName: string\) => \{[\s\S]*?return CAREER_SCHOOL_MAP\[careerName\] \|\| `ESCUELA DE \$\{careerName\.toUpperCase\(\)\}`;[\s\S]*?\};/g,
  `const getSchoolTitle = (careerName: string) => {
    const career = allCareers.find(c => c.name === careerName);
    return career?.schoolName || \`ESCUELA DE \${careerName.toUpperCase()}\`;
  };`
);

// 3. Update buildPhase2Requests signature and logic
content = content.replace(
  /export function buildPhase2Requests\([\s\S]*?careerGroups: CareerOfferingGroup\[\],[\s\S]*?careerSectionIds: string\[\],[\s\S]*?carreraQuestionId: string,[\s\S]*?carreraItemId: string[\s\S]*?\): BuildFormResult \{/,
  `export function buildPhase2Requests(
  careerGroups: CareerOfferingGroup[],
  careerSectionIds: string[],
  carreraQuestionId: string,
  carreraItemId: string,
  allCareers: CareerInfo[]
): BuildFormResult {`
);

content = content.replace(
  /const routedOptions = CAREER_OPTIONS\.map\(\(career\) => \{[\s\S]*?const groupIndex = careerGroups\.findIndex\(\(g\) => g\.career === career\);[\s\S]*?if \(groupIndex >= 0\) \{[\s\S]*?return \{ value: career, goToSectionId: careerSectionIds\[groupIndex\] \};[\s\S]*?\}[\s\S]*?\/\/ Career with no offerings — submit form directly[\s\S]*?return \{ value: career, goToAction: "SUBMIT_FORM" as const \};[\s\S]*?\}\);/g,
  `const routedOptions = allCareers.map((career) => {
    const groupIndex = careerGroups.findIndex((g) => g.career === career.name);
    if (groupIndex >= 0) {
      return { value: career.name, goToSectionId: careerSectionIds[groupIndex] };
    }
    // Career with no offerings — submit form directly
    return { value: career.name, goToAction: "SUBMIT_FORM" as const };
  });`
);

fs.writeFileSync(formBuilderPath, content, 'utf-8');
console.log('form-builder.ts updated successfully');
