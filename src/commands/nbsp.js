/**
 * Validates text to add &nbsp; tags where necessary, by using regex.
 * Modified for Propel
 * 
 * Original Author: Sebastian Bertozzi Moreno
 * Author: Jordan Chou
 */

const nbsp = '&nbsp;';
var inputHTML;

export function setInputHTMLForNbsp(input) {
    inputHTML = input;
}

export function fixAllIssues(isFrench) {
    var content = inputHTML.innerHTML;
    var rules = getRules(isFrench);
    Object.keys(rules).forEach(key => {
        content = content.replace(rules[key], match => match.replaceAll(/ /g, nbsp));

        // remove double &nbsp;
        while (content.includes(`${nbsp}${nbsp}`)) {
            content = content.replace(`${nbsp}${nbsp}`, nbsp);
        }
    });
    content = unfixImgAlt(content);
    return content;
}

function getRules(isFrench) {
    return isFrench ? {
        betweenDayAndMonth: /\d+\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
        betweenMonthAndYear: /(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d+/gi,
        afterNumber: /\d+\s+(jour|mois|ans|million|milliard|fois|pour\s+cent|pour&nbsp;cent)/gi,
        numberAfterTitle: /(Budget|Graphique|Tableau|Chapitre|Figure|Annexe)\s+\d+/gi,
        frenchNumbers: /\d{1,3}(\s+\d{3})+/g,
        percentage: /\d+\s+%/g,
        money: /\d+\s+\$/g,
        specificWords: /(Depuis|De|Du|Au|En|Pour|Le|Jusqu'à|article)\s+\d+/gi,
        ordinalNumbers: /\d+(er|e|ème|nd|rd)\s+/gi,
        colons: /[a-zA-Zéèàç]+\s+(:|;)/g,
        pourcent: /pour\s+cent/g
    } : {
        betweenMonthAndDay: /\d+(January|February|March|April|May|June|July|August|September|October|November|December)/gi,
        betweenMonthAndYear: /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+/gi,
        afterNumber: /\d+\s+(day|month|year|million|billion|times|percent|per\s+cent)/gi,
        numberAfterTitle: /(Budget|Graph|Table|Chapter|Figure|Article|Annex)\s+\d+/gi,
        percentage: /\d+\s+%/g,
        money: /\d+\s+\$/g,
        specificWords: /(Since|From|Of|To|In|For|On|Until)\s+\d+/gi,
        ordinalNumbers: /\d+(st|nd|rd|th)\s+/gi,
        percent: /per\s+cent/g
    };
}

function unfixImgAlt(html) {
    const div = document.createElement('div');
    div.innerHTML = html;

    const imgs = div.querySelectorAll('img');
    for (var img of imgs) {
        img.alt = img.alt.replaceAll(" ", " ");
    }
    
    return div.innerHTML;
}

// $(document).ready(function () {
//     $('#validateBtn').click(() => validateNbsp($('#lang').is(':checked')));
//     $(document).on('click', '#fixAllIssuesBtn', () => fixAllIssues($('#lang').is(':checked')));
//     $('#copyBtn').click(() => { navigator.clipboard.writeText(document.getElementById("outputText").value); });
//     $('#deleteBtn').click(() => { $('#inputText').val(''); })
// });