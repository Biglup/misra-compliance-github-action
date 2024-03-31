import fs from 'fs';
import path from 'path';

import {addResultTableRow, addTableHeaders} from "./render-results-table.js";
import {renderDeviations} from "./render-suppresions.js";
import {addFileAnalyzed} from "./render-files-analyzed.js";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDFDocument = await import('pdfkit').then(pkg => pkg.default || pkg);

const LEFT_MARGIN = 75;
const TITLE_FONT_SIZE = 19;
const CONTENT_FONT_SIZE = 10;
const REGULAR_FONT = path.join(__dirname, 'RobotoMono-Light.ttf');
const BOLD_FONT = path.join(__dirname, 'RobotoMono-Bold.ttf');
const MISRA_LOGO = path.join(__dirname, 'misra_c.png');
const MISRA_WIDTH = 85;
const LINE_MARGIN = 15;
const SUMMARY_CELL_MARGIN = 100;

let yPos = 0;

function addTableRow(doc, key, value) {
    doc.font(REGULAR_FONT)
        .fontSize(CONTENT_FONT_SIZE)
        .text(key, LEFT_MARGIN, yPos)
        .font(BOLD_FONT);

    if (value === "Compliant") {
        doc.fillColor('green').text(value, LEFT_MARGIN + SUMMARY_CELL_MARGIN, yPos);
    } else if (value === "Non-Compliant") {
        doc.fillColor('red').text(value, LEFT_MARGIN + SUMMARY_CELL_MARGIN, yPos);
    } else {
        doc.text(value, LEFT_MARGIN + SUMMARY_CELL_MARGIN, yPos);
    }

    doc.fillColor('black');

    yPos += LINE_MARGIN;
}

async function drawSummary(doc, project, commit, date, guidelines, checkingTool, compliance) {
    yPos = 230;
    addTableRow(doc, 'Project:', project);
    addTableRow(doc,'Commit:', commit);
    addTableRow(doc,'Date:', date);
    addTableRow(doc,'Guidelines:', guidelines);
    addTableRow(doc,'Checking Tool:', checkingTool);
    addTableRow(doc,'Result:', compliance);
}


// Function to convert counts into a descriptive part of the summary sentence
function countDescription(count, category, tag) {
    const plural = count === 1 ? '' : 's';
    return `${count} ${tag}${plural} of ${category} guidelines`;
}


async function drawSummaryText(doc, violationsByCategory, deviationsByCategory) {
    yPos += 20;

    doc.font(REGULAR_FONT)
        .fontSize(CONTENT_FONT_SIZE)
        .text('Summary:', LEFT_MARGIN, yPos);

    yPos+= LINE_MARGIN;

    const mandatoryDesc = countDescription(violationsByCategory.Mandatory, 'mandatory', 'violation');
    const requiredDesc = countDescription(violationsByCategory.Required, 'required', 'violation');
    const advisoryDesc = countDescription(violationsByCategory.Advisory, 'advisory', 'violation');

    const mandatoryDeviationDesc = countDescription(deviationsByCategory.Mandatory, 'mandatory', 'deviation');
    const requiredDeviationDesc = countDescription(deviationsByCategory.Required, 'required', 'deviation');
    const advisoryDeviationDesc = countDescription(deviationsByCategory.Advisory, 'advisory', 'deviation');

    const summarySentence = `There were ${mandatoryDesc}, ${requiredDesc}, and ${advisoryDesc}. There were also ${mandatoryDeviationDesc}, ${requiredDeviationDesc}, and ${advisoryDeviationDesc}.`;

    // Writing the summary sentence to the PDF
    doc.font(REGULAR_FONT)
        .fontSize(CONTENT_FONT_SIZE)
        .text(summarySentence, LEFT_MARGIN, yPos);

    yPos += LINE_MARGIN; // Adjust yPos for the next content
}

export async function generatePdfReport(result) {
    const { rules, files, project, commit, date, guidelines, checkingTool, compliance, outputFile, violationsByCategory, deviationsByCategory } = result;

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputFile));

    doc.image(MISRA_LOGO, LEFT_MARGIN, 75, { width: MISRA_WIDTH });

    doc.font(REGULAR_FONT)
        .fontSize(TITLE_FONT_SIZE)
        .text('MISRA Guideline Compliance Summary', LEFT_MARGIN, 175);

    await drawSummary(doc, project, commit, date, guidelines, checkingTool, compliance);
    await drawSummaryText(doc, violationsByCategory, deviationsByCategory);


    // Render Results
    const headers = ['Guideline', 'Category', 'Recategorization', 'Compliance'];

    addTableHeaders(headers, doc, LEFT_MARGIN, 430, LINE_MARGIN, [114, 114, 114, 114]);
    rules.forEach((row, index) => addResultTableRow(doc, row, index));
    doc.addPage();

    renderDeviations(doc);
    doc.addPage();

    // Render Files Analyzed
    doc.font(REGULAR_FONT)
        .fontSize(TITLE_FONT_SIZE)
        .text('Files Analyzed', LEFT_MARGIN, 75);

    files.forEach((row, index) => addFileAnalyzed(doc, row, index));

    doc.end();
}
