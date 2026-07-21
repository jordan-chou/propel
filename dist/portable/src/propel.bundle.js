(() => {
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

  // src/commands/anchors-aweigh.js
  var preview2 = document.getElementById("preview");
  var fullPrev = document.getElementById("fullPrev");
  var headerDepthInput = document.getElementById("headerDepth");
  function modifyHeadings(inputHTML3, headingIDCount2, modifiedComponents2) {
    const headings = inputHTML3.querySelectorAll("h1, h2, h3, h4, h5, h6");
    var counter = { num: headingIDCount2 };
    for (var heading of headings) {
      addIDToComponent(inputHTML3, heading, counter, "a");
      modifiedComponents2.push(heading.cloneNode(true));
    }
  }
  function modifyTables(inputHTML3, tableIDCount2, modifiedComponents2) {
    const tables = inputHTML3.querySelectorAll("table");
    var counter = { num: tableIDCount2 };
    for (var table of tables) {
      addIDToComponent(inputHTML3, table, counter, "t");
      modifiedComponents2.push(table.cloneNode(true));
    }
  }
  function modifyFigures(inputHTML3, figureIDCount2, modifiedComponents2) {
    const figures = inputHTML3.querySelectorAll("figure");
    var counter = { num: figureIDCount2 };
    for (var figure of figures) {
      addIDToComponent(inputHTML3, figure, counter, "f");
      modifiedComponents2.push(figure.cloneNode(true));
    }
  }
  function createOnThisPage(input, isEngLang2) {
    if (input.querySelector("div.onThisPage")) return;
    const isToCChecked = document.getElementById("isToC").checked;
    const MIN_HEADING_LEVEL = headerDepthInput.value;
    var headingTags = "";
    for (var i = 1; i <= MIN_HEADING_LEVEL; i++) {
      headingTags += "h" + i;
      if (i < MIN_HEADING_LEVEL) {
        headingTags += ", ";
      }
    }
    const headings = input.querySelectorAll(headingTags);
    const div = document.createElement("div");
    div.classList.add("onThisPage");
    div.innerHTML += `
    <h2 id=${!isEngLang2 ? "sur-cette-page" : "on-this-page"}>${isToCChecked ? !isEngLang2 ? "Table des mati\xE8res" : "Table of contents" : !isEngLang2 ? "Sur cette page :" : "On this page:"}</h2>
    `;
    const ul = document.createElement("ul");
    ul.classList.add("lst-spcd");
    var ulHTML = "";
    ul.innerHTML = generateHeadingsList(ulHTML, headings, !isEngLang2);
    div.appendChild(ul);
    const h1 = input.querySelector("h1");
    if (h1) {
      h1.insertAdjacentElement("afterend", div);
    } else {
      input.insertBefore(div, input.firstChild);
    }
  }
  function slugify(str) {
    const stopWords = [
      "a",
      "an",
      "and",
      "the",
      "of",
      "to",
      "in",
      "on",
      "for",
      "with",
      "by",
      "from",
      "about",
      "at",
      "as",
      "is",
      "aux",
      "\xE0",
      "de",
      "le",
      "la",
      "les",
      "un",
      "une",
      "par",
      "des",
      "du",
      "dans",
      "sur",
      "avec",
      "en",
      "ou",
      "et"
    ];
    const normalized = str.toLowerCase().normalize("NFD").replace(/\-/g, " ").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "");
    const slugWords = normalized.split(/\s+/).filter((word) => word && !stopWords.includes(word)).slice(0, 4);
    return slugWords.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  function addIDToComponent(inputHTML3, component, counter, prefix) {
    var slugChecked = null;
    if (!component.id) {
      if (slugChecked && prefix == "a") {
        let newID = slugify(component.textContent);
        let dupIDCount = 0;
        while (inputHTML3.querySelector(`*[id="${newID}${dupIDCount ? "-" + dupIDCount : ""}"]`)) {
          dupIDCount++;
        }
        component.id = `${newID}${dupIDCount > 0 ? "-" + dupIDCount : ""}`;
        return;
      }
      let checkForID;
      do {
        checkForID = inputHTML3.querySelector(`#${prefix}${++counter.num}`);
      } while (checkForID);
      component.id = `${prefix}${counter.num}`;
    }
  }
  function generateHeadingsList(ulHTML, headings, isFrenchChecked) {
    var prevLevel = 2;
    for (var heading of headings) {
      if (heading.textContent.trim().toLowerCase() == (isFrenchChecked ? "note de pas de page" : "footnotes")) {
        continue;
      }
      var headingHTML = heading.innerHTML.replace("\n", "");
      var headingLevel = heading.tagName.substring(1, heading.tagName.length);
      var tabChars = "";
      for (var j = 0; j < headingLevel; j++) {
        tabChars += "	";
      }
      if (headingLevel > prevLevel) {
        while (headingLevel - prevLevel >= 2) {
          ulHTML += tabChars + '<ul class="lst-spcd">\n';
          ulHTML += tabChars + "<li>";
          prevLevel++;
        }
        ulHTML += tabChars + '<ul class="lst-spcd">\n';
      } else if (headingLevel == prevLevel && headingLevel > 1) {
        ulHTML += tabChars + "</li>\n";
      } else if (headingLevel < prevLevel) {
        while (prevLevel - headingLevel >= 2) {
          ulHTML += tabChars + "</li>";
          ulHTML += tabChars + "</ul>\n";
          prevLevel--;
        }
        ulHTML += tabChars + "	</li>";
        ulHTML += tabChars + "	</ul>\n";
        ulHTML += tabChars + "</li>";
      }
      ulHTML += tabChars + "<li><a href='#" + heading.id + "'>" + headingHTML + "</a></li>";
      prevLevel = headingLevel;
    }
    return ulHTML;
  }
  function addGenericID(inputHTML3, component, prefix, startingCount = 0) {
    const counter = { num: startingCount };
    addIDToComponent(inputHTML3, component, counter, prefix);
    return component.id;
  }

  // src/commands/footnote-generator.js
  function createBodyFtnTags(inputHTML3, langStrings2) {
    const superscripts = inputHTML3.querySelectorAll('sup>a[id^="footnote-ref-"]');
    for (var s of superscripts) {
      const sup = document.createElement("sup");
      let matches = s.textContent.match(/(\d+)/);
      const fnNum = matches[0];
      sup.id = `fn${fnNum}-rf`;
      sup.innerHTML = `<a class="fn-lnk" href="#fn${fnNum}"><span class="wb-inv">${langStrings2["FN_DT"]} </span>${fnNum}</a>`;
      s.parentNode.parentNode.replaceChild(sup, s.parentNode);
    }
  }
  function replaceFootnoteSection(inputHTML3, langStrings2, isEngLang2) {
    const firstFootnote = inputHTML3.querySelector('li[id^="footnote-"]');
    firstFootnote.parentNode.parentNode.replaceChild(createFootnotes(inputHTML3, langStrings2, isEngLang2), firstFootnote.parentNode);
  }
  function createFootnotes(inputHTML3, langStrings2, isEngLang2) {
    const footnotes = inputHTML3.querySelectorAll('li[id^="footnote-"]');
    const aside = document.createElement("aside");
    aside.classList.add("wb-fnote");
    aside.setAttribute("role", "note");
    aside.innerHTML = `<h2 id="fn">${langStrings2["FN_H2"]}</h2>`;
    var fnCount = 1;
    const dl = document.createElement("dl");
    for (var f of footnotes) {
      let matches = f.id.match(/(\d+)/);
      let fnNum = matches[0] - 1;
      if (fnNum <= 0) {
        fnNum = 1;
      }
      const a = f.querySelector('a[href^="#footnote-ref-"]');
      a.parentNode.removeChild(a);
      dl.innerHTML += `
            <dt>${langStrings2["FN_DT"]} ${fnNum}</dt>
            <dd id="fn${fnNum}">
                ${f.innerHTML}
                <p class="fn-rtn"><a href="#fn${fnNum}-rf"><span class="wb-inv">${langStrings2["FN_SP1"]} </span>${fnNum}${isEngLang2 ? `<span class="wb-inv"> ${langStrings2["FN_SP2"]}</span>` : ""}</a></p>
            </dd>`;
    }
    aside.appendChild(dl);
    return aside;
  }

  // src/commands/nbsp.js
  var nbsp = "&nbsp;";
  function fixNbspHTML(html, isFrench, documentRef = document) {
    var content = applyNbspRules(html, isFrench);
    return unfixImgAlt(content, documentRef);
  }
  function applyNbspRules(html, isFrench) {
    var content = html;
    var rules = getRules(isFrench);
    Object.keys(rules).forEach((key) => {
      content = content.replace(rules[key], (match) => match.replaceAll(/ /g, nbsp));
      while (content.includes(`${nbsp}${nbsp}`)) {
        content = content.replace(`${nbsp}${nbsp}`, nbsp);
      }
    });
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
  function unfixImgAlt(html, documentRef) {
    const div = documentRef.createElement("div");
    div.innerHTML = html;
    const imgs = div.querySelectorAll("img");
    for (var img of imgs) {
      img.alt = img.alt.replaceAll("\xA0", " ");
    }
    return div.innerHTML;
  }

  // src/commands/table-cleanup.js
  var defaultTableCleanupOptions = {
    format: true,
    trim: true,
    financialTable: true,
    removeBoldFromRowHeaders: true,
    addScope: true,
    addTfoot: false,
    frenchNumbers: false,
    removeAttributes: [
      "width",
      "valign",
      "align",
      "border",
      "cellspacing",
      "cellpadding",
      "nowrap"
    ],
    unwrapTags: ["p"]
  };
  function cleanupTable(inputTable, options = {}) {
    if (!inputTable) {
      return null;
    }
    const mergedOptions = mergeOptions(options);
    const table = normalizeTableStructure(inputTable);
    const tableContainer = mergedOptions.format ? ensureResponsiveWrapper(table) : table;
    cleanTableElements(table, mergedOptions);
    if (mergedOptions.format) {
      formatWetTable(table, mergedOptions);
    }
    if (mergedOptions.trim) {
      trimTableCells(table);
    }
    if (mergedOptions.frenchNumbers) {
      formatFrenchNumbers(table);
    }
    return tableContainer;
  }
  function formatWetTable(table, options = {}) {
    const mergedOptions = mergeOptions(options);
    const tbody = ensureTbody(table);
    if (!tbody) {
      return table;
    }
    table.classList.add("table", "table-bordered");
    const thead = ensureThead(table, tbody);
    formatThead(thead, mergedOptions);
    formatTbody(tbody, mergedOptions);
    if (mergedOptions.addTfoot && !table.querySelector("tfoot")) {
      addTableFoot(table, true, mergedOptions.financialTable);
    }
    return table;
  }
  function addTableFoot(table, includePlaceholder = true, financialTable = false) {
    if (!table) {
      return null;
    }
    const tfoot = document.createElement("tfoot");
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    tr.classList.add("small");
    td.setAttribute("colspan", String(getTableWidth(table)));
    if (includePlaceholder) {
      const placeholder = financialTable ? td : document.createElement("p");
      placeholder.textContent = "NOTES, SOURCES and FOOTNOTES GO HERE";
      if (placeholder !== td) {
        td.appendChild(placeholder);
      }
    }
    tr.appendChild(td);
    tfoot.appendChild(tr);
    table.appendChild(tfoot);
    return tfoot;
  }
  function renameTag(sourceElement, targetTagName) {
    if (!sourceElement || sourceElement.tagName.toLowerCase() === targetTagName.toLowerCase()) {
      return sourceElement;
    }
    const targetElement = document.createElement(targetTagName);
    Array.from(sourceElement.attributes).forEach((attribute) => {
      targetElement.setAttribute(attribute.name, attribute.value);
    });
    while (sourceElement.firstChild) {
      targetElement.appendChild(sourceElement.firstChild);
    }
    sourceElement.replaceWith(targetElement);
    return targetElement;
  }
  function mergeOptions(options) {
    return {
      ...defaultTableCleanupOptions,
      ...options,
      removeAttributes: options.removeAttributes || defaultTableCleanupOptions.removeAttributes,
      unwrapTags: options.unwrapTags || defaultTableCleanupOptions.unwrapTags
    };
  }
  function normalizeTableStructure(table) {
    if (table.parentElement && table.parentElement.matches("div.table-responsive")) {
      return table;
    }
    return table;
  }
  function ensureResponsiveWrapper(table) {
    if (table.parentElement && table.parentElement.matches("div.table-responsive")) {
      return table.parentElement;
    }
    const wrapper = document.createElement("div");
    wrapper.classList.add("table-responsive");
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
    return wrapper;
  }
  function cleanTableElements(table, options) {
    const elements = [table, ...Array.from(table.querySelectorAll("*"))];
    elements.forEach((element) => {
      options.removeAttributes.forEach((attribute) => {
        element.removeAttribute(attribute);
      });
    });
    options.unwrapTags.forEach((tagName) => {
      Array.from(table.querySelectorAll(tagName)).filter((element) => tagName.toLowerCase() !== "p" || !element.closest("tfoot")).forEach(unwrapElement);
    });
  }
  function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
  }
  function ensureTbody(table) {
    let tbody = table.querySelector("tbody");
    if (tbody) {
      return tbody;
    }
    const rows = Array.from(table.children).filter((child) => child.tagName && child.tagName.toLowerCase() === "tr");
    if (!rows.length) {
      return null;
    }
    tbody = document.createElement("tbody");
    rows[0].before(tbody);
    rows.forEach((row) => tbody.appendChild(row));
    return tbody;
  }
  function ensureThead(table, tbody) {
    let thead = table.querySelector("thead");
    if (thead) {
      return thead;
    }
    thead = document.createElement("thead");
    table.insertBefore(thead, tbody);
    const firstRow = tbody.querySelector("tr");
    if (firstRow) {
      thead.appendChild(firstRow);
    }
    return thead;
  }
  function formatThead(thead, options) {
    Array.from(thead.querySelectorAll("tr")).forEach((row) => {
      row.classList.add("bg-dark", "text-white");
      row.classList.remove("active");
      Array.from(row.querySelectorAll("th, td")).forEach((cell, index) => {
        const headerCell = renameTag(cell, "th");
        if (options.addScope) {
          headerCell.setAttribute("scope", "col");
        }
        if (index > 0 && options.financialTable) {
          headerCell.classList.add("text-right");
        } else if (index > 0) {
          headerCell.classList.remove("text-right");
        }
      });
    });
  }
  function formatTbody(tbody, options) {
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      if (!options.financialTable) {
        row.classList.remove("text-right");
      }
      const firstCell = row.querySelector("th, td");
      if (!firstCell) {
        return;
      }
      const rowHeader = renameTag(firstCell, "th");
      if (options.addScope) {
        rowHeader.setAttribute("scope", "row");
      }
      if (rowHeader.hasAttribute("colspan")) {
        if (options.addScope) {
          rowHeader.setAttribute("scope", "colgroup");
        }
      } else if (rowHeader.hasAttribute("rowspan") && options.addScope) {
        rowHeader.setAttribute("scope", "rowgroup");
      } else if (options.removeBoldFromRowHeaders) {
        rowHeader.classList.add("fnt-nrml");
      }
      if (options.financialTable) {
        Array.from(row.querySelectorAll("td")).forEach((cell) => {
          cell.classList.add("text-right");
        });
      } else {
        Array.from(row.querySelectorAll("td")).forEach((cell) => {
          cell.classList.remove("text-right");
        });
      }
    });
  }
  function trimTableCells(table) {
    Array.from(table.querySelectorAll("th, td")).forEach((cell) => {
      if (!cell.textContent.trim()) {
        return;
      }
      cell.innerHTML = trimNbsp(cell.innerHTML.replace(/\s{2,}/g, " ").trim());
    });
  }
  function trimNbsp(value) {
    let output = value.trim();
    if (output === "&nbsp;") {
      return output;
    }
    while (output.startsWith("&nbsp;")) {
      output = output.substring("&nbsp;".length);
    }
    while (output.endsWith("&nbsp;")) {
      output = output.substring(0, output.length - "&nbsp;".length);
    }
    return output;
  }
  function formatFrenchNumbers(table) {
    Array.from(table.querySelectorAll("td")).forEach((cell) => {
      if (!cell.textContent.trim()) {
        return;
      }
      while (/\d \d\d\d/.test(cell.innerHTML)) {
        cell.innerHTML = cell.innerHTML.replace(/(\d) (\d\d\d)/g, "$1&nbsp;$2");
      }
      cell.innerHTML = cell.innerHTML.replace(/(\d)\.(\d)/g, "$1,$2");
    });
  }
  function getTableWidth(table) {
    return Array.from(table.querySelectorAll("tr")).reduce((width, row) => {
      const rowWidth = Array.from(row.querySelectorAll("th, td")).reduce((total, cell) => {
        return total + Number(cell.getAttribute("colspan") || 1);
      }, 0);
      return Math.max(width, rowWidth);
    }, 1);
  }

  // src/util.js
  async function copyToClipboard(outputText3, copiedLabel) {
    const textToCopy = typeof outputText3 === "string" ? outputText3 : outputText3.value;
    const highlightedElement = typeof outputText3 === "string" ? null : outputText3;
    if (highlightedElement) {
      highlightedElement.style.boxShadow = "0px 0px 5px green";
    }
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(textToCopy);
    } catch (error) {
      const copyArea = document.createElement("textarea");
      copyArea.value = textToCopy;
      copyArea.setAttribute("readonly", "");
      copyArea.style.position = "fixed";
      copyArea.style.top = "0";
      copyArea.style.left = "0";
      copyArea.style.opacity = "0";
      document.body.appendChild(copyArea);
      copyArea.select();
      try {
        if (!document.execCommand("copy")) {
          throw error;
        }
      } finally {
        copyArea.remove();
      }
    }
    if (copiedLabel) {
      copiedLabel.classList.remove("wb-inv");
    }
    setTimeout(() => {
      if (highlightedElement) {
        highlightedElement.style.boxShadow = null;
      }
      if (copiedLabel) {
        copiedLabel.classList.add("wb-inv");
      }
    }, 2e3);
  }
  function scrollSmoothTo(element) {
    if (element) {
      element.scrollIntoView({
        block: "start",
        behavior: "smooth"
      });
    }
  }
  function renameTag2(oldTag, newTag) {
    if (!oldTag || oldTag.tagName.toLowerCase() === newTag.toLowerCase()) {
      return oldTag;
    }
    const newNode = document.createElement(newTag);
    while (oldTag.firstChild) {
      newNode.appendChild(oldTag.firstChild);
    }
    Array.from(oldTag.attributes).forEach((attribute) => {
      newNode.setAttribute(attribute.name, attribute.value);
    });
    if (oldTag.parentNode) {
      oldTag.parentNode.replaceChild(newNode, oldTag);
    }
    return newNode;
  }
  function formattedHTML(html) {
    const unformatted = html.outerHTML.trim();
    const formatted = html_beautify(unformatted, {
      indent_size: 4,
      preserve_newlines: true
    });
    return formatted;
  }

  // src/commands/qa-helper.js
  var qaHelperTagsDefault = `
h2
h3
h4
h5
h6
table > caption
table > tfoot
figure
`;
  var lightCSS = "css/prettify.css";
  var darkCSS = "css/desert.css";
  function countTags(input) {
    const results = document.getElementById("qaHelperResults");
    const compare = document.getElementById("qaHelperCompare");
    const output = document.getElementById("qaHelperOutput");
    compare.innerHTML = output.innerHTML = "";
    results.classList.remove("wb-inv");
    if (!input.innerHTML) return;
    const div = document.createElement("div");
    div.appendChild(input.cloneNode(true));
    let html = div.querySelector("div.content-area");
    let tags = getTagList();
    for (var i = 0; i < tags.length; i++) {
      createOutputElement(tags[i], html);
    }
    scrollSmoothTo(output);
    PR.prettyPrint();
  }
  function setUpPresetBtns(buttons) {
    const buttonBar = document.getElementById("presetButtonBar");
    for (var button of buttons) {
      buttonBar.appendChild(createPresetButton(button));
      buttonBar.appendChild(document.createTextNode("\n"));
    }
  }
  function collapseAll() {
    const output = document.getElementById("qaHelperOutput");
    let details = output.querySelectorAll("details");
    for (var d of details) {
      d.open = false;
    }
  }
  function setCodeTheme() {
    const lightTheme2 = document.getElementById("lightTheme");
    const darkTheme2 = document.getElementById("darkTheme");
    const theme = document.getElementById("theme");
    if (lightTheme2.checked) {
      theme.href = lightCSS.trim();
    } else if (darkTheme2.checked) {
      theme.href = darkCSS.trim();
    }
  }
  function createPresetButton(button) {
    const preset = document.createElement("button");
    let name = document.createTextNode(button.name);
    preset.classList.add("btn", "btn-primary", "btn-sm");
    preset.addEventListener("click", () => {
      const countBtn2 = document.getElementById("qaHelperCountBtn");
      const tagText2 = document.getElementById("tagList");
      tagText2.value = "";
      for (var tag of button.tags) {
        tagText2.value += `${tag}
`;
      }
      tagText2.value = tagText2.value.trim();
      countBtn2.click();
    });
    preset.appendChild(name);
    return preset;
  }
  function getTagList() {
    const tagText2 = document.getElementById("tagList");
    const tags = tagText2.value.trim().split("\n");
    return tags;
  }
  function createOutputElement(tag, html) {
    const output = document.getElementById("qaHelperOutput");
    let tags = getTags(tag, html);
    let details = document.createElement("details");
    let summary = document.createElement("summary");
    let label = document.createElement("strong");
    let labelText = document.createTextNode(`${tag}: `);
    let numElements = countElements(tags);
    let count = document.createTextNode(numElements);
    if (numElements <= 0) {
      details.setAttribute("onclick", "return false");
      details.style.pointerEvents = "none";
    }
    label.appendChild(labelText);
    summary.appendChild(label);
    summary.appendChild(count);
    details.appendChild(summary);
    const elementList = createElementList(tags);
    if (elementList) {
      details.appendChild(elementList);
    }
    output.appendChild(details);
  }
  function countElements(tags) {
    if (tags) {
      return tags.length;
    } else {
      return "not a valid selector";
    }
  }
  function createElementList(tags) {
    let list = document.createElement("ol");
    list.classList.add("lst-spcd", "mrgn-tp-lg");
    if (!tags) return;
    for (var tag of tags) {
      let li = document.createElement("li");
      let pre = document.createElement("pre");
      let text = document.createTextNode(tag.outerHTML);
      pre.classList.add("prettyprint");
      pre.style.fontSize = "small";
      pre.appendChild(text);
      li.appendChild(pre);
      list.appendChild(li);
    }
    return list;
  }
  function getTags(tag, html) {
    try {
      return html.querySelectorAll(tag);
    } catch (err) {
      return null;
    }
  }

  // src/strings.js
  var LANG_BTN_EN = "English";
  var SOURCES_TXT_EN = "Data Sources";
  var GRF_TXT_EN = "GRF Area";
  var TRGT_POP_TXT_EN = "Target Population";
  var GBA_PLUS_TXT_EN = "GBA Plus Timing";
  var GENDER_TXT_EN = "Gender";
  var INCOME_TXT_EN = "Income";
  var AGE_TXT_EN = "Age cohort";
  var ADDTNL_TXT_EN = "Additional Characteristics";
  var LNK_TO_BDGT_EN = "Learn more about this Budget measure";
  var CHART_TXT_EN = "Chart";
  var NOTE_TXT_EN = "Note";
  var TEXT_VER_TXT_EN = "Text version";
  var FN_H2_EN = "Footnotes";
  var FN_DT_EN = "Footnote";
  var FN_SP1_EN = "Return to footnote ";
  var FN_SP2_EN = " referrer";
  var FIGURE_TXT_EN = "Figure";
  var SOURCE_TXT = "Source";
  var engStrings = {
    "LANG_BTN": LANG_BTN_EN,
    "SOURCES_TXT": SOURCES_TXT_EN,
    "GRF_TXT": GRF_TXT_EN,
    "TRGT_POP_TXT": TRGT_POP_TXT_EN,
    "GBA_PLUS_TXT": GBA_PLUS_TXT_EN,
    "GENDER_TXT": GENDER_TXT_EN,
    "INCOME_TXT": INCOME_TXT_EN,
    "AGE_TXT": AGE_TXT_EN,
    "ADDTNL_TXT": ADDTNL_TXT_EN,
    "LNK_TO_BDGT": LNK_TO_BDGT_EN,
    "CHART_TXT": CHART_TXT_EN,
    "NOTE_TXT": NOTE_TXT_EN,
    "FIGURE_TXT": FIGURE_TXT_EN,
    "TEXT_VER_TXT": TEXT_VER_TXT_EN,
    "SOURCE_TXT": SOURCE_TXT,
    "FN_H2": FN_H2_EN,
    "FN_DT": FN_DT_EN,
    "FN_SP1": FN_SP1_EN,
    "FN_SP2": FN_SP2_EN
  };
  var LANG_BTN_FR = "Fran\xE7ais";
  var SOURCES_TXT_FR = "Source des donn\xE9es";
  var GRF_TXT_FR = "Domaine li\xE9 au CRRG";
  var TRGT_POP_TXT_FR = "Population cible";
  var GBA_PLUS_TXT_FR = "\xC9ch\xE9ancier de l'ACS Plus";
  var GENDER_TXT_FR = "Gendre";
  var INCOME_TXT_FR = "Distribution du revenu";
  var AGE_TXT_FR = "Cohorte d'\xE2ge";
  var ADDTNL_TXT_FR = "Autres caract\xE9ristiques";
  var LNK_TO_BDGT_FR = "En savoir plus sur cette mesure budg\xE9taire";
  var CHART_TXT_FR = "Graphique";
  var NOTE_TXT_FR = "Nota";
  var FIGURE_TXT_FR = "Figure";
  var TEXT_VER_TXT_FR = "Version texte";
  var FN_H2_FR = "Notes de bas de page";
  var FN_DT_FR = "Note de bas de page";
  var FN_SP1_FR = "Retour \xE0 la r\xE9f\xE9rence de la note de bas de page ";
  var frStrings = {
    "LANG_BTN": LANG_BTN_FR,
    "SOURCES_TXT": SOURCES_TXT_FR,
    "GRF_TXT": GRF_TXT_FR,
    "TRGT_POP_TXT": TRGT_POP_TXT_FR,
    "GBA_PLUS_TXT": GBA_PLUS_TXT_FR,
    "GENDER_TXT": GENDER_TXT_FR,
    "INCOME_TXT": INCOME_TXT_FR,
    "AGE_TXT": AGE_TXT_FR,
    "ADDTNL_TXT": ADDTNL_TXT_FR,
    "LNK_TO_BDGT": LNK_TO_BDGT_FR,
    "CHART_TXT": CHART_TXT_FR,
    "NOTE_TXT": NOTE_TXT_FR,
    "FIGURE_TXT": FIGURE_TXT_FR,
    "TEXT_VER_TXT": TEXT_VER_TXT_FR,
    "SOURCE_TXT": SOURCE_TXT,
    "FN_H2": FN_H2_FR,
    "FN_DT": FN_DT_FR,
    "FN_SP1": FN_SP1_FR
  };

  // src/document/document-store.js
  var _root, _listeners, _revision, _DocumentStore_instances, publish_fn;
  var DocumentStore = class {
    constructor(root) {
      __privateAdd(this, _DocumentStore_instances);
      __privateAdd(this, _root);
      __privateAdd(this, _listeners, /* @__PURE__ */ new Set());
      __privateAdd(this, _revision, 0);
      if (!(root instanceof HTMLElement)) {
        throw new TypeError("DocumentStore requires an HTMLElement root.");
      }
      __privateSet(this, _root, root);
    }
    get root() {
      return __privateGet(this, _root);
    }
    get revision() {
      return __privateGet(this, _revision);
    }
    getHTML() {
      return __privateGet(this, _root).innerHTML;
    }
    replaceHTML(html, metadata = {}) {
      __privateGet(this, _root).innerHTML = html;
      __privateMethod(this, _DocumentStore_instances, publish_fn).call(this, { type: "replace", ...metadata });
      return __privateGet(this, _root);
    }
    mutate(label, mutation, metadata = {}) {
      if (typeof mutation !== "function") {
        throw new TypeError("Document mutation must be a function.");
      }
      const result = mutation(__privateGet(this, _root));
      __privateMethod(this, _DocumentStore_instances, publish_fn).call(this, { type: "mutation", label, ...metadata });
      return result;
    }
    touch(label, metadata = {}) {
      __privateMethod(this, _DocumentStore_instances, publish_fn).call(this, { type: "mutation", label, ...metadata });
    }
    subscribe(listener) {
      __privateGet(this, _listeners).add(listener);
      return () => __privateGet(this, _listeners).delete(listener);
    }
    snapshot() {
      return Object.freeze({ html: this.getHTML(), revision: __privateGet(this, _revision) });
    }
  };
  _root = new WeakMap();
  _listeners = new WeakMap();
  _revision = new WeakMap();
  _DocumentStore_instances = new WeakSet();
  publish_fn = function(change) {
    __privateSet(this, _revision, __privateGet(this, _revision) + 1);
    const event = Object.freeze({ ...change, revision: __privateGet(this, _revision) });
    __privateGet(this, _listeners).forEach((listener) => listener(event, this));
  };

  // src/document/cleanup.js
  function cleanImageSources(root) {
    const images = root.querySelectorAll("img");
    images.forEach((image) => image.setAttribute("src", ""));
    return images.length;
  }
  function removeWordBookmarks(root) {
    const bookmarks = root.querySelectorAll('a[id^="_"]');
    bookmarks.forEach((bookmark) => bookmark.replaceWith(...bookmark.childNodes));
    return bookmarks.length;
  }
  function cleanWordBookmarkLinks(root) {
    const links = root.querySelectorAll('a[href^="#_Toc"]');
    links.forEach((link) => link.setAttribute("href", ""));
    return links.length;
  }
  function normalizeSmartQuotes(root) {
    root.innerHTML = root.innerHTML.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  }
  function runStandardCleanup(root) {
    const changes = {
      imageSources: cleanImageSources(root),
      bookmarks: removeWordBookmarks(root),
      bookmarkLinks: cleanWordBookmarkLinks(root)
    };
    normalizeSmartQuotes(root);
    return Object.freeze(changes);
  }

  // src/review/analyzer.js
  function analyzeDocument(root) {
    var _a2, _b;
    const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const tables = Array.from(root.querySelectorAll("table"));
    const figures = Array.from(root.querySelectorAll("figure"));
    const images = Array.from(root.querySelectorAll("img"));
    const links = Array.from(root.querySelectorAll("a"));
    const documentPositionPreceding = (_b = (_a2 = root.ownerDocument.defaultView) == null ? void 0 : _a2.Node.DOCUMENT_POSITION_PRECEDING) != null ? _b : 2;
    const missingIdTargets = [...headings, ...tables, ...figures].filter((element) => !element.id).sort((first, second) => first.compareDocumentPosition(second) & documentPositionPreceding ? 1 : -1);
    const headingSkips = headings.filter((heading, index) => index > 0 && Number(heading.tagName.substring(1)) > Number(headings[index - 1].tagName.substring(1)) + 1);
    const issueGroups = [
      { label: "Empty links", severity: "error", targets: links.filter((link) => {
        var _a3;
        return !((_a3 = link.getAttribute("href")) == null ? void 0 : _a3.trim());
      }), getMessage: (target) => `${describeTarget(target, "Link")} has an empty or missing href value.` },
      { label: "Missing IDs", severity: "warning", action: "addIds", actionLabel: "Add IDs", targets: missingIdTargets, getMessage: (target) => `${describeTarget(target, getTargetType(target))} is missing an ID.` },
      { label: "Table cleanup", severity: "error", action: "tableCleanup", actionLabel: "Table Cleanup", targets: tables.filter((table) => !isCleanedTable(table)), getMessage: (target, index) => `${describeTarget(target, `Table ${index + 1}`)} may not have been cleaned up yet. Open Table cleanup to review.` },
      { label: "Heading level skips", severity: "error", targets: headingSkips, getMessage: (target) => `${describeTarget(target, target.tagName)} may skip a heading level.` },
      { label: "Missing image alt text", severity: "error", targets: images.filter((image) => !image.hasAttribute("alt")), getMessage: (target, index) => `${describeTarget(target, `Image ${index + 1}`)} is missing an alt attribute. Empty alt may be valid for decorative images.` }
    ].filter((group) => group.targets.length > 0);
    return Object.freeze({
      stats: Object.freeze({
        headings: headings.length,
        tables: tables.length,
        figures: figures.length,
        images: images.length,
        links: links.length,
        footnoteRefs: root.querySelectorAll('sup a, a[href^="#fn"], a[href^="#ftn"]').length,
        emptyLinks: links.filter((link) => {
          var _a3;
          return !((_a3 = link.getAttribute("href")) == null ? void 0 : _a3.trim());
        }).length,
        missingHeadingIds: headings.filter((heading) => !heading.id).length,
        missingTableIds: tables.filter((table) => !table.id).length,
        tablesNeedingCleanup: tables.filter((table) => !isCleanedTable(table)).length,
        missingFigureIds: figures.filter((figure) => !figure.id).length,
        imagesMissingAlt: images.filter((image) => !image.hasAttribute("alt")).length,
        headingSkips: headingSkips.length
      }),
      issueGroups
    });
  }
  function isCleanedTable(table) {
    var _a2;
    return Boolean((table == null ? void 0 : table.classList.contains("table")) && table.classList.contains("table-bordered") && ((_a2 = table.parentElement) == null ? void 0 : _a2.matches("div.table-responsive")) && table.querySelector(":scope > thead") && table.querySelector(":scope > tbody"));
  }
  function getTargetType(target) {
    if (target.matches("table")) return "Table";
    if (target.matches("figure")) return "Figure";
    return target.tagName;
  }
  function describeTarget(target, fallback) {
    var _a2, _b;
    const text = (((_a2 = target.getAttribute) == null ? void 0 : _a2.call(target, "aria-label")) || ((_b = target.getAttribute) == null ? void 0 : _b.call(target, "alt")) || target.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return fallback;
    const summary = text.length > 42 ? `${text.substring(0, 39).trim()}\u2026` : text;
    return `${fallback} \u201C${summary}\u201D`;
  }

  // src/app/deferred-work.js
  function createDeferredWork(callback, delay = 160, timers = globalThis) {
    let timer = null;
    function cancel() {
      if (timer === null) return;
      timers.clearTimeout(timer);
      timer = null;
    }
    function run() {
      cancel();
      callback();
    }
    return Object.freeze({
      schedule() {
        cancel();
        timer = timers.setTimeout(run, delay);
      },
      flush() {
        if (timer !== null) run();
      },
      cancel
    });
  }

  // src/commands/command-registry.js
  var _commands;
  var CommandRegistry = class {
    constructor() {
      __privateAdd(this, _commands, /* @__PURE__ */ new Map());
    }
    register(id, definition) {
      if (!id || typeof (definition == null ? void 0 : definition.execute) !== "function") {
        throw new TypeError("Commands require an id and execute function.");
      }
      if (__privateGet(this, _commands).has(id)) {
        throw new Error(`Command already registered: ${id}`);
      }
      __privateGet(this, _commands).set(id, Object.freeze({ id, ...definition }));
      return this;
    }
    get(id) {
      return __privateGet(this, _commands).get(id) || null;
    }
    list() {
      return Array.from(__privateGet(this, _commands).values());
    }
    async execute(id, context = {}) {
      const command = this.get(id);
      if (!command) throw new Error(`Unknown command: ${id}`);
      return command.execute(context);
    }
  };
  _commands = new WeakMap();
  function createCommandResult({ html, summary = "", changes = [], warnings = [], affectedPaths = [] }) {
    return Object.freeze({ html, summary, changes, warnings, affectedPaths });
  }

  // src/commands/component-library.js
  var COMPONENT_LIBRARY_FORMAT = "propel-component-library";
  var COMPONENT_LIBRARY_VERSION = 1;
  var COMPONENT_CONTENT_SLOT = "{{content}}";
  var defaultComponentLibrary = Object.freeze({
    format: COMPONENT_LIBRARY_FORMAT,
    version: COMPONENT_LIBRARY_VERSION,
    name: "Propel starter components",
    components: Object.freeze([
      Object.freeze({
        id: "box-heading-panel",
        name: "Box: Heading panel",
        description: "Uses the first table cell or heading as the panel heading.",
        conversion: "heading-content",
        template: '<section class="panel panel-default mrgn-tp-md mrgn-bttm-md">\n<header class="panel-heading">\n<div class="panel-title mrgn-tp-0 h4">{{heading}}</div>\n</header>\n<div class="panel-body">\n{{content}}\n</div>\n</section>'
      }),
      Object.freeze({
        id: "box-gray",
        name: "Box: Gray",
        description: "Uses the first table cell or heading as the box heading.",
        conversion: "heading-content",
        template: '<section class="well mrgn-tp-md mrgn-bttm-md">\n<h4 class="mrgn-tp-0 h4">{{heading}}</h4>\n{{content}}\n</section>'
      }),
      Object.freeze({
        id: "box-white",
        name: "Box: White",
        description: "Uses the first table cell or heading as the box heading.",
        conversion: "heading-content",
        template: '<section class="panel panel-default mrgn-tp-md mrgn-bttm-md">\n<div class="panel-body">\n<h4 class="mrgn-tp-0 h4">{{heading}}</h4>\n{{content}}\n</div>\n</section>'
      }),
      Object.freeze({
        id: "chart-figure",
        name: "Charts and Figures",
        description: "Uses the first image as the chart and preserves the table as its accessible text version.",
        conversion: "chart",
        template: '<figure class="panel panel-default">\n<figcaption class="panel-heading">{{chartNumber}}<br>\n<b>{{chartTitle}}</b></figcaption>\n<div class="panel-body">{{image}}</div>\n<footer class="panel-footer">\n{{footerMetadata}}\n<details class="mrgn-tp-sm">\n<summary>{{textVersionLabel}}</summary>\n</details>\n</footer>\n</figure>'
      }),
      Object.freeze({
        id: "charts-double",
        name: "Charts: Double",
        description: "Creates a two-column chart row while preserving the selected table as a text version.",
        conversion: "double-chart",
        template: '<div class="row">\n<div class="col-md-6">{{figureOne}}</div>\n<div class="col-md-6">{{figureTwo}}</div>\n</div>\n<div class="wb-inv component-text-version">{{content}}</div>'
      }),
      Object.freeze({
        id: "quote",
        name: "Quote",
        description: "Uses the first three table cells as quote, author, and citation.",
        conversion: "quote",
        template: '<div class="row">\n<div class="col-lg-10 col-lg-offset-1">\n<blockquote>\n{{content}}\n<footer class="text-right">{{author}}<br>\n<cite>{{citation}}</cite>\n</footer>\n</blockquote>\n</div>\n</div>'
      })
    ])
  });
  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function hasUnsafeTemplateMarkup(template) {
    return /<(?:script|style|link|iframe|object|embed)\b/i.test(template) || /\son[a-z]+\s*=/i.test(template) || /(?:href|src)\s*=\s*["']?\s*javascript:/i.test(template);
  }
  function validateComponentLibrary(value) {
    const errors = [];
    if (!isRecord(value)) return { valid: false, errors: ["Library must be a JSON object."] };
    if (value.format !== COMPONENT_LIBRARY_FORMAT) errors.push(`format must be "${COMPONENT_LIBRARY_FORMAT}".`);
    if (value.version !== COMPONENT_LIBRARY_VERSION) errors.push(`version must be ${COMPONENT_LIBRARY_VERSION}.`);
    if (typeof value.name !== "string" || !value.name.trim()) errors.push("name must be a non-empty string.");
    if (!Array.isArray(value.components) || value.components.length === 0) {
      errors.push("components must be a non-empty array.");
    } else {
      const ids = /* @__PURE__ */ new Set();
      value.components.forEach((component, index) => {
        const path = `components[${index}]`;
        if (!isRecord(component)) {
          errors.push(`${path} must be an object.`);
          return;
        }
        if (typeof component.id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(component.id)) {
          errors.push(`${path}.id must contain only letters, numbers, dots, underscores, or hyphens.`);
        } else if (ids.has(component.id)) {
          errors.push(`${path}.id must be unique.`);
        } else {
          ids.add(component.id);
        }
        if (typeof component.name !== "string" || !component.name.trim()) errors.push(`${path}.name must be a non-empty string.`);
        if (component.description !== void 0 && typeof component.description !== "string") errors.push(`${path}.description must be a string.`);
        if (component.conversion !== void 0 && !["heading-content", "chart", "double-chart", "quote"].includes(component.conversion)) errors.push(`${path}.conversion is not supported.`);
        if (typeof component.template !== "string") {
          errors.push(`${path}.template must be a string.`);
        } else if (component.template.split(COMPONENT_CONTENT_SLOT).length !== 2) {
          errors.push(`${path}.template must contain exactly one ${COMPONENT_CONTENT_SLOT} slot.`);
        } else if (hasUnsafeTemplateMarkup(component.template)) {
          errors.push(`${path}.template contains executable or embedded content that is not allowed.`);
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }
  function parseComponentLibrary(json) {
    let value;
    try {
      value = JSON.parse(json);
    } catch (e) {
      throw new Error("The selected file is not valid JSON.");
    }
    const validation = validateComponentLibrary(value);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    return {
      format: value.format,
      version: value.version,
      name: value.name.trim(),
      components: value.components.map((component) => ({
        id: component.id,
        name: component.name.trim(),
        description: component.description || "",
        ...component.conversion ? { conversion: component.conversion } : {},
        template: component.template
      }))
    };
  }
  function serializeComponentLibrary(library) {
    const validation = validateComponentLibrary(library);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    return `${JSON.stringify(library, null, 2)}
`;
  }
  function applyComponentTemplate(template, selectedHTML) {
    if (typeof template !== "string" || template.split(COMPONENT_CONTENT_SLOT).length !== 2) {
      throw new Error(`Component template must contain exactly one ${COMPONENT_CONTENT_SLOT} slot.`);
    }
    return template.replace(COMPONENT_CONTENT_SLOT, selectedHTML);
  }
  function getTableCells(html) {
    return Array.from(html.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi), (match) => match[1].trim()).filter(Boolean);
  }
  function getFirstHeading(html) {
    const match = html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    return match ? { heading: match[1].trim(), content: html.replace(match[0], "").trim() } : null;
  }
  function getTextContent(html) {
    return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  }
  function unwrapTextBlock(html) {
    const match = html.trim().match(/^<(?:p|h[1-6])\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>$/i);
    return match ? match[1].trim() : html.trim();
  }
  function splitHeadingCell(cell, hasFollowingCells, fallbackHeading) {
    const explicitHeading = cell.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
    if (explicitHeading) {
      return { heading: explicitHeading[1].trim(), content: cell.replace(explicitHeading[0], "").trim() };
    }
    const blocks = Array.from(cell.matchAll(/<(?:p|h[1-6])\b[^>]*>[\s\S]*?<\/(?:p|h[1-6])>/gi), (match) => match[0]);
    if (blocks.length > 1) {
      return { heading: unwrapTextBlock(blocks[0]), content: cell.replace(blocks[0], "").trim() };
    }
    const singleBlock = blocks.length === 1 ? blocks[0] : cell;
    const blockInner = unwrapTextBlock(singleBlock);
    const leadingEmphasis = blockInner.match(/^<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*(?:<br\s*\/?>)?\s*([\s\S]*)$/i);
    if (leadingEmphasis && leadingEmphasis[2].trim()) {
      return { heading: leadingEmphasis[1].trim(), content: asParagraph(leadingEmphasis[2].trim()) };
    }
    const lineBreak = blockInner.match(/^([\s\S]*?)<br\s*\/?>\s*([\s\S]+)$/i);
    if (lineBreak) {
      return { heading: lineBreak[1].trim(), content: asParagraph(lineBreak[2].trim()) };
    }
    const text = getTextContent(blockInner);
    const looksLikeHeading = text.length > 0 && text.length <= 80 && !/[.!?](?:\s|$)/.test(text);
    if (hasFollowingCells || looksLikeHeading) {
      return { heading: blockInner, content: "" };
    }
    return { heading: fallbackHeading, content: singleBlock.trim() };
  }
  function getHeadingContent(html, cells, fallbackHeading) {
    if (cells.length > 0) {
      const firstCell = splitHeadingCell(cells[0], cells.length > 1, fallbackHeading);
      const body = [firstCell.content, ...cells.slice(1).map(asParagraph)].filter(Boolean).join("\n");
      return { heading: firstCell.heading, content: body || "<p></p>" };
    }
    const headingMatch = getFirstHeading(html);
    if (headingMatch) return { heading: headingMatch.heading, content: headingMatch.content || "<p></p>" };
    const split = splitHeadingCell(html, false, fallbackHeading);
    return { heading: split.heading, content: split.content || "<p></p>" };
  }
  function asParagraph(html) {
    return /^<(?:p|ul|ol|div|section|table)\b/i.test(html.trim()) ? html : `<p>${html}</p>`;
  }
  function fillTemplate(template, values) {
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{{${name}}}`, value), template);
  }
  function chartFigure({ heading, image, content, labels }) {
    return `<figure class="panel panel-default">
<figcaption class="panel-heading">${heading}</figcaption>
<div class="panel-body">${image}</div>
<footer class="panel-footer"><p class="small">${labels.notes}</p><p class="small">${labels.sources}</p><details class="mrgn-tp-sm"><summary>${labels.textVersion}</summary>${content}</details></footer>
</figure>`;
  }
  function normalizeChartImage(image) {
    if (/\bclass\s*=/i.test(image)) {
      return image.replace(/class=(['"])(.*?)\1/i, (_match, quote, classes) => `class=${quote}${classes} img-responsive full-width${quote}`);
    }
    return image.replace(/^<img\b/i, '<img class="img-responsive full-width"');
  }
  function getCellParts(cell) {
    const blocks = Array.from(cell.matchAll(/<(?:p|h[1-6]|div)\b[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|div)>/gi), (match) => match[1].trim()).filter(Boolean);
    return blocks.length > 0 ? blocks : [unwrapTextBlock(cell)];
  }
  function isNotesCell(cell) {
    return /^(?:notes?|remarques?)\s*:?/i.test(getTextContent(cell));
  }
  function isSourcesCell(cell) {
    return /^sources?\s*:?/i.test(getTextContent(cell));
  }
  function isSuperscriptNote(cell) {
    return /^\s*<sup\b/i.test(cell);
  }
  function asSmallParagraph(cell) {
    const content = unwrapTextBlock(cell);
    return `<p class="small">${content}</p>`;
  }
  function getChartFields(cells, labels) {
    const parts = cells.flatMap(getCellParts).filter(Boolean);
    const imageIndex = parts.findIndex((part) => /<img\b/i.test(part));
    const metadataCells = parts.filter((part) => isNotesCell(part) || isSourcesCell(part) || isSuperscriptNote(part));
    const notesCell = metadataCells.find(isNotesCell);
    const sourcesCell = metadataCells.find(isSourcesCell);
    const headingParts = parts.filter(
      (part, index) => !/<img\b/i.test(part) && !metadataCells.includes(part) && (imageIndex < 0 || index < imageIndex)
    );
    let chartNumber = headingParts[0] || labels.chartNumber;
    let chartTitle = headingParts[1] || labels.chartTitle;
    const combinedHeading = getTextContent(chartNumber);
    const combinedMatch = combinedHeading.match(/^((?:chart|figure|graphique)\s*(?:n[o°.]?|#)?\s*\d+)\s*[:–—-]\s*(.+)$/i);
    if (combinedMatch && chartTitle === labels.chartTitle) {
      chartNumber = combinedMatch[1];
      chartTitle = combinedMatch[2];
    }
    const footerMetadata = metadataCells.length > 0 ? metadataCells.map(asSmallParagraph).join("\n") : `<p class="small">${labels.notes}</p>
<p class="small">${labels.sources}</p>`;
    return {
      chartNumber,
      chartTitle,
      heading: `${chartNumber}<br>
<b>${chartTitle}</b>`,
      footerMetadata,
      notesLabel: notesCell ? unwrapTextBlock(notesCell) : metadataCells.find(isSuperscriptNote) || labels.notes,
      sourcesLabel: sourcesCell ? unwrapTextBlock(sourcesCell) : labels.sources
    };
  }
  function applySmartComponent(component, selectedHTML, { language = "en" } = {}) {
    const isFrench = language === "fr";
    const labels = {
      heading: isFrench ? "Titre" : "Heading",
      chartNumber: isFrench ? "Graphique no" : "Chart #",
      chartTitle: isFrench ? "Titre du graphique" : "Chart title",
      notes: "Notes",
      sources: "Sources",
      textVersion: isFrench ? "Version texte" : "Text version",
      author: isFrench ? "Nom de l\u2019auteur" : "Author\u2019s name",
      citation: isFrench ? "Titre du contenu cit\xE9" : "Title of cited source content"
    };
    const componentSourceHTML = selectedHTML.replace(/<table\b/gi, '<table data-propel-component-source="true"');
    const cells = getTableCells(selectedHTML);
    if (component.conversion === "heading-content") {
      return fillTemplate(component.template, getHeadingContent(selectedHTML, cells, labels.heading));
    }
    if (component.conversion === "quote") {
      return fillTemplate(component.template, {
        content: asParagraph(cells[0] || selectedHTML),
        author: cells[1] || labels.author,
        citation: cells[2] || labels.citation
      });
    }
    if (component.conversion === "chart" || component.conversion === "double-chart") {
      const images = Array.from(selectedHTML.matchAll(/<img\b[^>]*>/gi), (match) => normalizeChartImage(match[0]));
      const textVersion = /<table\b/i.test(selectedHTML) ? componentSourceHTML : asParagraph(selectedHTML);
      if (component.conversion === "double-chart") {
        const figureOne = chartFigure({ heading: cells[0] || `${labels.chartNumber}<br><b>${labels.chartTitle}</b>`, image: images[0] || "", content: textVersion, labels });
        const figureTwo = chartFigure({ heading: cells[1] || `${labels.chartNumber}<br><b>${labels.chartTitle}</b>`, image: images[1] || images[0] || "", content: textVersion, labels });
        return fillTemplate(component.template, { figureOne, figureTwo, content: textVersion });
      }
      const chartFields = getChartFields(cells, labels);
      return fillTemplate(component.template, {
        ...chartFields,
        image: images[0] || "",
        content: textVersion,
        textVersionLabel: labels.textVersion
      });
    }
    return applyComponentTemplate(component.template, componentSourceHTML);
  }
  function convertSelectionToComponent({ html, selectionStart, selectionEnd, component, language = "en" }) {
    if (typeof html !== "string" || !component) throw new TypeError("HTML and a component are required.");
    if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart || selectionEnd > html.length) {
      throw new Error("Select text or HTML before converting it to a component.");
    }
    const selectedHTML = html.slice(selectionStart, selectionEnd);
    const converted = applySmartComponent(component, selectedHTML, { language });
    return createCommandResult({
      html: `${html.slice(0, selectionStart)}${converted}${html.slice(selectionEnd)}`,
      summary: `Converted selection to ${component.name}.`,
      changes: [{ type: "replace-selection", componentId: component.id, selectionStart, selectionEnd }],
      affectedPaths: ["selection"]
    });
  }

  // src/table-editor/model.js
  function buildCellGrid(table) {
    if (!table) return [];
    const grid = [];
    Array.from(table.querySelectorAll("tr")).forEach((row, rowIndex) => {
      Array.from(row.querySelectorAll(":scope > th, :scope > td")).forEach((cell, columnIndex) => {
        grid.push({ cell, row: rowIndex, column: columnIndex });
      });
    });
    return grid;
  }
  function getCellPosition(table, cell) {
    return buildCellGrid(table).find((entry) => entry.cell === cell) || null;
  }

  // src/table-editor/formatting.js
  function isCellBold(cell) {
    if (!cell) {
      return false;
    }
    if (cell.tagName.toLowerCase() === "th") {
      return !cell.classList.contains("fnt-nrml");
    }
    return Boolean(cell.children.length === 1 && cell.firstElementChild && cell.firstElementChild.tagName.toLowerCase() === "strong");
  }
  function setCellBold(cell, shouldBeBold) {
    if (!cell) {
      return;
    }
    if (cell.tagName.toLowerCase() === "th") {
      cell.classList.toggle("fnt-nrml", !shouldBeBold);
      return;
    }
    const strong = isCellBold(cell) ? cell.firstElementChild : null;
    if (!shouldBeBold && strong) {
      while (strong.firstChild) {
        cell.insertBefore(strong.firstChild, strong);
      }
      strong.remove();
      cell.classList.add("fnt-nrml");
      return;
    }
    if (!shouldBeBold || strong) {
      return;
    }
    const wrapper = document.createElement("strong");
    while (cell.firstChild) {
      wrapper.appendChild(cell.firstChild);
    }
    cell.appendChild(wrapper);
    cell.classList.remove("fnt-nrml");
  }
  function toggleCellsBold(cells) {
    const selectedCells = Array.from(cells || []);
    const shouldBeBold = !selectedCells.every(isCellBold);
    selectedCells.forEach((cell) => setCellBold(cell, shouldBeBold));
  }
  function toggleRowsActive(rows) {
    Array.from(rows || []).forEach((row) => {
      if (!row || row.closest("thead")) {
        return;
      }
      const isActive = row.classList.toggle("active");
      const cells = Array.from(row.querySelectorAll("th, td"));
      cells.forEach((cell) => setCellBold(cell, isActive));
      if (cells[0]) {
        cells[0].setAttribute("scope", isActive ? "colgroup" : "row");
      }
    });
  }

  // src/table-editor/footer.js
  function moveRowsToTableFooter(table, rows) {
    const sourceRows = Array.from(rows || []).filter((row) => {
      return row && row.closest("table") === table && !row.closest("tfoot");
    });
    if (!table || sourceRows.length === 0) {
      return { movedRows: 0, footer: table ? table.querySelector("tfoot") : null };
    }
    const footer = ensureFooter(table);
    const footerCell = ensureFooterCell(table, footer);
    removeEmptyFooterParagraphs(footerCell);
    sourceRows.forEach((row) => {
      const hasExistingContent = hasMeaningfulContent(footerCell);
      if (hasExistingContent) {
        wrapDirectFooterContent(footerCell);
      }
      const destination = hasExistingContent ? document.createElement("p") : footerCell;
      const cells = Array.from(row.querySelectorAll(":scope > th, :scope > td"));
      cells.forEach((cell, index) => {
        if (index > 0 && destination.lastChild) {
          destination.appendChild(document.createTextNode(" "));
        }
        moveCellContents(cell, destination);
      });
      if (destination !== footerCell) {
        footerCell.appendChild(destination);
      }
      row.remove();
    });
    return { movedRows: sourceRows.length, footer };
  }
  function ensureFooter(table) {
    let footer = table.querySelector("tfoot");
    if (!footer) {
      footer = document.createElement("tfoot");
      table.appendChild(footer);
    }
    return footer;
  }
  function ensureFooterCell(table, footer) {
    let row = footer.querySelector("tr");
    if (!row) {
      row = document.createElement("tr");
      row.classList.add("small");
      footer.appendChild(row);
    }
    let cell = row.querySelector("th, td");
    if (!cell) {
      cell = document.createElement("td");
      row.appendChild(cell);
    }
    cell.setAttribute("colspan", String(getTableWidth2(table)));
    return cell;
  }
  function getTableWidth2(table) {
    return Math.max(1, ...Array.from(table.rows).map((row) => {
      return Array.from(row.cells).reduce((width, cell) => width + Number(cell.colSpan || 1), 0);
    }));
  }
  function removeEmptyFooterParagraphs(cell) {
    Array.from(cell.querySelectorAll(":scope > p")).forEach((paragraph) => {
      if (!paragraph.textContent.replace(/\u00a0/g, "").trim() && !paragraph.querySelector("img, a, br")) {
        paragraph.remove();
      }
    });
  }
  function hasMeaningfulContent(cell) {
    return Array.from(cell.childNodes).some((node) => {
      return node.nodeType !== Node.TEXT_NODE || node.textContent.replace(/\u00a0/g, "").trim();
    });
  }
  function wrapDirectFooterContent(cell) {
    const directNodes = Array.from(cell.childNodes).filter((node) => {
      return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== "p";
    });
    if (directNodes.length === 0) {
      return;
    }
    const paragraph = document.createElement("p");
    directNodes.forEach((node) => paragraph.appendChild(node));
    cell.insertBefore(paragraph, cell.firstChild);
  }
  function moveCellContents(cell, paragraph) {
    Array.from(cell.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === "p") {
        while (node.firstChild) {
          paragraph.appendChild(node.firstChild);
        }
        node.remove();
        return;
      }
      paragraph.appendChild(node);
    });
  }

  // src/table-editor/scoping.js
  var INDENT_CLASSES = ["mrgn-lft-md", "mrgn-lft-lg", "mrgn-lft-xl"];
  var MANUAL_SCOPE_ATTRIBUTES = ["data-propel-scope-add", "data-propel-scope-remove"];
  function applyTableScopes(table, options = {}) {
    if (!table) return;
    const renameTag3 = options.renameTag || ((cell) => cell);
    const complex = options.complex !== false;
    const rows = Array.from(table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr"));
    rows.forEach((row) => {
      const inHead = Boolean(row.closest("thead"));
      if (inHead) {
        row.classList.add("bg-dark", "text-white");
        row.classList.remove("active");
        Array.from(row.querySelectorAll(":scope > th, :scope > td")).forEach((cell) => {
          renameTag3(cell, "th").setAttribute("scope", "col");
        });
        return;
      }
      const firstCell = row.querySelector(":scope > th, :scope > td");
      if (!firstCell) return;
      const rowHeader = renameTag3(firstCell, "th");
      rowHeader.setAttribute("scope", rowHeader.hasAttribute("colspan") || row.classList.contains("active") ? "colgroup" : rowHeader.hasAttribute("rowspan") ? "rowgroup" : "row");
    });
    if (!complex) {
      table.querySelectorAll("[headers]").forEach((cell) => cell.removeAttribute("headers"));
      return;
    }
    applyExplicitAssociations(table, buildSpanningGrid(table), options.idRoot || table.ownerDocument);
  }
  function applyExplicitAssociations(table, grid, idRoot) {
    addGenericID(idRoot, table, "t");
    const entries = grid.entries;
    const headerEntries = entries.filter(({ cell }) => cell.tagName.toLowerCase() === "th");
    headerEntries.forEach(({ cell }, index) => ensureHeaderId(table, cell, index + 1));
    let activeParent = null;
    let hierarchy = [];
    grid.rows.forEach((row, rowIndex) => {
      if (row.closest("thead")) return;
      const rowEntries = entries.filter((entry) => entry.row === rowIndex && entry.originRow === rowIndex);
      const rowHeader = rowEntries.find(({ cell }) => cell.tagName.toLowerCase() === "th") || null;
      const isActive = row.classList.contains("active");
      const indentLevel = rowHeader ? getIndentLevel(rowHeader.cell) : 0;
      if (isActive && rowHeader) {
        activeParent = rowHeader.cell;
        hierarchy = [rowHeader.cell];
      }
      const ancestors = isActive ? [] : hierarchy.slice(0, indentLevel);
      rowEntries.forEach((entry) => {
        const associations = [];
        columnHeadersFor(entry, headerEntries).forEach((header) => addAssociation(associations, header));
        if (activeParent !== entry.cell) addAssociation(associations, activeParent);
        ancestors.forEach((header) => {
          if (header !== entry.cell && header !== activeParent) addAssociation(associations, header);
        });
        if (rowHeader && rowHeader.cell !== entry.cell) addAssociation(associations, rowHeader.cell);
        setHeaders(entry.cell, associations);
      });
      if (rowHeader) {
        hierarchy[indentLevel] = rowHeader.cell;
        hierarchy.length = indentLevel + 1;
      }
    });
  }
  function columnHeadersFor(entry, headerEntries) {
    return headerEntries.filter((header) => header.cell.closest("thead") && rangesOverlap(entry.column, entry.columnSpan, header.column, header.columnSpan)).sort((first, second) => first.row - second.row).map(({ cell }) => cell);
  }
  function addAssociation(associations, header) {
    if (header && !associations.includes(header)) associations.push(header);
  }
  function setHeaders(cell, associations) {
    const removed = getIdList(cell, MANUAL_SCOPE_ATTRIBUTES[1]);
    const added = getIdList(cell, MANUAL_SCOPE_ATTRIBUTES[0]);
    const ids = associations.map((header) => header.id).filter((id) => id && !removed.includes(id));
    added.forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
    if (ids.length) cell.setAttribute("headers", ids.join(" "));
    else cell.removeAttribute("headers");
  }
  function setManualHeaderRelationship(parent, child, enabled) {
    if (!parent || !child || parent === child || !parent.id) return false;
    const addAttribute = MANUAL_SCOPE_ATTRIBUTES[0];
    const removeAttribute = MANUAL_SCOPE_ATTRIBUTES[1];
    const additions = getIdList(child, addAttribute).filter((id) => id !== parent.id);
    const removals = getIdList(child, removeAttribute).filter((id) => id !== parent.id);
    if (enabled) additions.push(parent.id);
    else removals.push(parent.id);
    setIdList(child, addAttribute, additions);
    setIdList(child, removeAttribute, removals);
    const headers = getIdList(child, "headers").filter((id) => id !== parent.id);
    if (enabled) headers.push(parent.id);
    setIdList(child, "headers", headers);
    return true;
  }
  function hasHeaderRelationship(parent, child) {
    return Boolean(parent && parent.id && getIdList(child, "headers").includes(parent.id));
  }
  function pruneTableHeaderRelationships(table) {
    if (!table) return;
    const validIds = new Set(Array.from(table.querySelectorAll("th[id]"), (header) => header.id));
    table.querySelectorAll("th, td").forEach((cell) => {
      ["headers", ...MANUAL_SCOPE_ATTRIBUTES].forEach((attribute) => {
        setIdList(cell, attribute, getIdList(cell, attribute).filter((id) => validIds.has(id)));
      });
    });
  }
  function preserveExistingHeaderRelationships(table) {
    if (!table || !table.querySelector("[headers]")) return;
    const headerIds = Array.from(table.querySelectorAll("th[id]")).map((header) => header.id);
    if (!headerIds.length) return;
    table.querySelectorAll("th, td").forEach((cell) => {
      const existing = getIdList(cell, "headers");
      setIdList(cell, MANUAL_SCOPE_ATTRIBUTES[0], existing);
      setIdList(cell, MANUAL_SCOPE_ATTRIBUTES[1], headerIds.filter((id) => !existing.includes(id)));
    });
  }
  function getIdList(cell, attribute) {
    return (cell.getAttribute(attribute) || "").trim().split(/\s+/).filter(Boolean);
  }
  function setIdList(cell, attribute, ids) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length) cell.setAttribute(attribute, uniqueIds.join(" "));
    else cell.removeAttribute(attribute);
  }
  function ensureHeaderId(table, cell, ordinal) {
    if (cell.id) return cell.id;
    const base = `${table.id || "table"}-h${ordinal}`.replace(/[^A-Za-z0-9_-]/g, "-");
    let candidate = base;
    let suffix = 2;
    while (table.ownerDocument.getElementById(candidate)) candidate = `${base}-${suffix++}`;
    cell.id = candidate;
    return candidate;
  }
  function getIndentLevel(cell) {
    const wrapper = Array.from(cell.children).find((child) => INDENT_CLASSES.some((name) => child.classList.contains(name)));
    if (!wrapper) return 0;
    return INDENT_CLASSES.findIndex((name) => wrapper.classList.contains(name)) + 1;
  }
  function rangesOverlap(startA, spanA, startB, spanB) {
    return startA < startB + spanB && startB < startA + spanA;
  }
  function buildSpanningGrid(table) {
    const occupied = [];
    const entries = [];
    const rows = Array.from(table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr"));
    rows.forEach((row, rowIndex) => {
      occupied[rowIndex] || (occupied[rowIndex] = []);
      let column = 0;
      Array.from(row.querySelectorAll(":scope > th, :scope > td")).forEach((cell) => {
        while (occupied[rowIndex][column]) column++;
        const rowSpan = Math.max(1, Number(cell.getAttribute("rowspan") || 1));
        const columnSpan = Math.max(1, Number(cell.getAttribute("colspan") || 1));
        entries.push({ cell, row: rowIndex, originRow: rowIndex, column, rowSpan, columnSpan });
        for (let y = rowIndex; y < rowIndex + rowSpan; y++) {
          occupied[y] || (occupied[y] = []);
          for (let x = column; x < column + columnSpan; x++) occupied[y][x] = cell;
        }
        column += columnSpan;
      });
    });
    return { rows, entries };
  }

  // src/table-editor/columns.js
  function deleteSelectedTableColumns(table, selectedCells) {
    const layout = buildVisualColumnLayout(table);
    const selected = new Set(Array.from(selectedCells || []));
    const columns = /* @__PURE__ */ new Set();
    layout.entries.filter(({ cell }) => selected.has(cell)).forEach(({ column, columnSpan }) => {
      for (let index = column; index < column + columnSpan; index++) {
        columns.add(index);
      }
    });
    if (columns.size === 0) {
      return { changed: false, deletedColumns: 0, blocked: false };
    }
    if (columns.size >= layout.width) {
      return { changed: false, deletedColumns: 0, blocked: true };
    }
    layout.entries.forEach(({ cell, column, columnSpan }) => {
      let overlap = 0;
      for (let index = column; index < column + columnSpan; index++) {
        if (columns.has(index)) overlap++;
      }
      if (overlap === 0) return;
      if (overlap === columnSpan) {
        cell.remove();
        return;
      }
      const remainingSpan = columnSpan - overlap;
      if (remainingSpan === 1) cell.removeAttribute("colspan");
      else cell.setAttribute("colspan", String(remainingSpan));
    });
    layout.rows.forEach((row) => {
      if (!row.querySelector(":scope > th, :scope > td")) row.remove();
    });
    pruneTableHeaderRelationships(table);
    return { changed: true, deletedColumns: columns.size, blocked: false };
  }
  function buildVisualColumnLayout(table) {
    if (!table) return { entries: [], rows: [], width: 0 };
    const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row.closest("table") === table);
    const entries = [];
    let occupancy = [];
    let previousSection = null;
    let width = 0;
    rows.forEach((row) => {
      const section = row.parentElement;
      if (section !== previousSection) {
        occupancy = [];
        previousSection = section;
      }
      let column = 0;
      Array.from(row.querySelectorAll(":scope > th, :scope > td")).forEach((cell) => {
        while (occupancy[column] > 0) column++;
        const columnSpan = Math.max(1, Number(cell.getAttribute("colspan")) || 1);
        const rowSpan = Math.max(1, Number(cell.getAttribute("rowspan")) || 1);
        entries.push({ cell, column, columnSpan });
        for (let index = column; index < column + columnSpan; index++) {
          occupancy[index] = Math.max(occupancy[index] || 0, rowSpan);
        }
        column += columnSpan;
      });
      width = Math.max(width, column, occupancy.length);
      occupancy = occupancy.map((remaining) => Math.max(0, remaining - 1));
    });
    return { entries, rows, width };
  }

  // src/table-editor/caption-suggestions.js
  var TABLE_UNIT_PATTERN = /^(?:units?|unit[eé]s?)\s*[:\-]|^(?:per\s+cent|percent(?:age)?|pour\s+cent|pourcentage)\b|^(?:[$€£]\s*)?(?:in\s+|en\s+)?(?:thousands?|millions?|billions?|milliers?|milliards?)(?:\s+of|\s+de)?\b|^\([^)]*(?:[$€£%]|dollars?|euros?|per\s+cent|percent(?:age)?|pour\s+cent|pourcentage|millions?|billions?|milliers?|milliards?)[^)]*\)$/i;
  var TABLE_NUMBER_PATTERN = /^(?:table|tableau)\s+(?:no\.?\s*)?(?:\d+|[ivxlcdm]+)(?:[.\-:]|\b)/i;
  function isTableUnitLabel(text) {
    return TABLE_UNIT_PATTERN.test(String(text || "").trim());
  }
  function classifyTableCaptionLabels(labels) {
    const values = Array.from(labels || [], (label) => String(label || "").trim());
    const number = values.findIndex((value) => TABLE_NUMBER_PATTERN.test(value));
    let unit = values.findIndex(isTableUnitLabel);
    const result = {};
    if (number >= 0) {
      result.number = number;
      const title = values.findIndex((value, index) => index > number && index !== unit && Boolean(value));
      if (title >= 0) {
        result.title = title;
      }
      if (unit < 0 && title >= 0) {
        unit = values.findIndex((value, index) => index > title && Boolean(value));
      }
    }
    if (unit >= 0) {
      result.unit = unit;
    }
    return result;
  }

  // src/table-editor/controller.js
  function shouldRunInitialTableCleanup(table, previewCleanup, isCleanedTable2) {
    return Boolean(previewCleanup && table && !isCleanedTable2(table));
  }
  function runPreservingElementScroll(element, callback) {
    const scrollTop = element ? element.scrollTop : null;
    try {
      return callback();
    } finally {
      if (element && scrollTop !== null) {
        element.scrollTop = scrollTop;
      }
    }
  }
  function createTableEditorController(config) {
    const {
      elements,
      inputHTML: inputHTML3,
      liveEditor: liveEditor2,
      liveEditorHost: liveEditorHost2,
      uiPreferences: uiPreferences2,
      cleanupTable: cleanupTable2,
      isCleanedTable: isCleanedTable2,
      defaultTableCleanupOptions: defaultTableCleanupOptions2,
      renameTag: renameTag3,
      getEditorSelection: getEditorSelection2,
      getClosestElement: getClosestElement2,
      preserveParagraphsOnEnter: preserveParagraphsOnEnter2,
      getFocusableElements: getFocusableElements3,
      addProcessingLog: addProcessingLog2,
      showActivityToast: showActivityToast2,
      syncLiveToInputHTML: syncLiveToInputHTML2,
      scrollLiveElementIntoView: scrollLiveElementIntoView2,
      commitTableChanges,
      openComponentLibraryForTable: openComponentLibraryForTable2,
      isLiveEditorSelectingText,
      isEnglish
    } = config;
    const {
      tableEditorDialog,
      tableEditorResizeHandle,
      tableEditorSnapGuides,
      tableEditorFullscreenBtn,
      tableEditorCloseBtn,
      tableEditorCancelBtn,
      tableEditorComponentBtn,
      tableEditorApplyBtn,
      tableEditorApplyNextBtn,
      tableEditorFirstBtn,
      tableEditorPrevBtn,
      tableEditorNextBtn,
      tableEditorLastBtn,
      tableEditorPages,
      tableEditorUndoBtn,
      tableEditorRedoBtn,
      tableEditorDeselectBtn,
      tableEditorScopingModeBtn,
      tableEditorHeaderBtn,
      tableEditorMergeRowBtn,
      tableEditorMergeCellsBtn,
      tableEditorActiveBtn,
      tableEditorAddFooterBtn,
      tableEditorTfootBtn,
      tableEditorIndentBtn,
      tableEditorOutdentBtn,
      tableEditorBoldBtn,
      tableEditorLeftBtn,
      tableEditorCenterBtn,
      tableEditorRightBtn,
      tableEditorDeleteRowBtn,
      tableEditorDeleteColumnBtn,
      tableEditorStatus,
      tableEditorCanvas,
      tableEditorNumber,
      tableEditorCaption,
      tableEditorUnit,
      tableEditorNumberSuggestion,
      tableEditorCaptionSuggestion,
      tableEditorUnitSuggestion,
      tableEditorComplexScoping,
      tableEditorFinancial,
      tableEditorFrench,
      optionHelpButtons,
      optionTooltip,
      toastRegion: toastRegion2,
      liveTableEditPopover,
      liveTableComponentPopover
    } = elements;
    let tableEditorIndex = 0;
    let tableEditorPreviousFocus = null;
    let tableEditorPreviousLiveScrollTop = null;
    let tableEditorLastSelectedCell = null;
    let tableEditorDragStartCell = null;
    let tableEditorIsDragging = false;
    let tableEditorPreviewCleanup = false;
    let liveTableEditTarget = null;
    let tableEditorHistory = [];
    let tableEditorHistoryIndex = -1;
    let tableEditorHistoryTimer = null;
    let tableEditorHistoryRestoring = false;
    let tableEditorPendingAction = null;
    let tableEditorCaptionSuggestions = {};
    let tableEditorAcceptedExternalCaptionNodes = /* @__PURE__ */ new Set();
    let tableEditorScopingMode = false;
    let tableEditorScopeParent = null;
    let tableEditorScopePaintEnabled = null;
    const tableEditorSizeStorageKey = "tableEditorSize";
    const tableEditorBottomLayoutQuery = window.matchMedia("(orientation: portrait) and (min-width: 768px), (max-width: 767px)");
    const tableEditorMobileLayoutQuery = window.matchMedia("(max-width: 767px)");
    const tableEditorSnapZone = 24;
    function syncTableEditorFrenchOption() {
      if (tableEditorFrench) tableEditorFrench.checked = !isEnglish();
    }
    function createTableEditorListeners() {
      if (!tableEditorDialog) {
        return;
      }
      [tableEditorCloseBtn, tableEditorCancelBtn].forEach((element) => {
        if (element) {
          element.addEventListener("click", closeTableEditor);
        }
      });
      if (tableEditorDialog) {
        tableEditorDialog.addEventListener("keydown", handleTableEditorDialogKeydown);
      }
      if (tableEditorFullscreenBtn) {
        tableEditorFullscreenBtn.addEventListener("click", toggleTableEditorFullscreen);
      }
      if (tableEditorResizeHandle) {
        tableEditorResizeHandle.addEventListener("pointerdown", startTableEditorResize);
        tableEditorResizeHandle.addEventListener("keydown", handleTableEditorResizeKeydown);
      }
      tableEditorBottomLayoutQuery.addEventListener("change", updateTableEditorResizeHandle);
      if (tableEditorCanvas) {
        tableEditorCanvas.addEventListener("beforeinput", removeEmptyFooterPlaceholder);
        tableEditorCanvas.addEventListener("input", () => scheduleTableEditorHistoryCommit("Edit table content"));
        tableEditorCanvas.addEventListener("paste", replaceEmptyFooterPlaceholderOnPaste);
        tableEditorCanvas.addEventListener("keydown", preserveParagraphsOnEnter2);
        tableEditorCanvas.addEventListener("click", handleTableEditorCanvasClick);
        tableEditorCanvas.addEventListener("mousedown", handleTableEditorCanvasMouseDown);
        tableEditorCanvas.addEventListener("mouseover", handleTableEditorCanvasMouseOver);
        document.addEventListener("mouseup", handleTableEditorDocumentMouseUp);
      }
      if (tableEditorApplyBtn) {
        tableEditorApplyBtn.addEventListener("click", () => applyTableEditorChanges(false));
      }
      if (tableEditorApplyNextBtn) {
        tableEditorApplyNextBtn.addEventListener("click", () => applyTableEditorChanges(true));
      }
      if (tableEditorComponentBtn) {
        tableEditorComponentBtn.addEventListener("click", openActiveTableComponentLibrary);
      }
      if (liveTableComponentPopover) {
        liveTableComponentPopover.addEventListener("click", openHoveredLiveTableComponentLibrary);
      }
      if (tableEditorFirstBtn) {
        tableEditorFirstBtn.addEventListener("click", () => renderTableEditor(0));
      }
      if (tableEditorPrevBtn) {
        tableEditorPrevBtn.addEventListener("click", () => renderTableEditor(tableEditorIndex - 1));
      }
      if (tableEditorNextBtn) {
        tableEditorNextBtn.addEventListener("click", () => renderTableEditor(tableEditorIndex + 1));
      }
      if (tableEditorLastBtn) {
        tableEditorLastBtn.addEventListener("click", () => renderTableEditor(getTableEditorItems().length - 1));
      }
      if (tableEditorDeselectBtn) {
        tableEditorDeselectBtn.addEventListener("click", deselectTableEditorCells);
      }
      if (tableEditorScopingModeBtn) {
        tableEditorScopingModeBtn.addEventListener("click", toggleTableEditorScopingMode);
      }
      if (tableEditorHeaderBtn) {
        tableEditorHeaderBtn.addEventListener("click", () => runTableEditorMutation(toggleTableEditorHeaderRows, "Header row"));
      }
      if (tableEditorMergeRowBtn) {
        tableEditorMergeRowBtn.addEventListener("click", () => runTableEditorMutation(mergeTableEditorRows, "Merge row"));
      }
      if (tableEditorMergeCellsBtn) {
        tableEditorMergeCellsBtn.addEventListener("click", () => runTableEditorMutation(mergeTableEditorSelectedCells, "Merge cells"));
      }
      if (tableEditorActiveBtn) {
        tableEditorActiveBtn.addEventListener("click", () => runTableEditorMutation(toggleTableEditorActiveRows, "Active row"));
      }
      if (tableEditorAddFooterBtn) {
        tableEditorAddFooterBtn.addEventListener("click", () => runTableEditorMutation(addEmptyTableEditorFooter, "Add empty footer"));
      }
      if (tableEditorTfootBtn) {
        tableEditorTfootBtn.addEventListener("click", () => runTableEditorMutation(moveTableEditorRowsToFooter, "Move row content to footer"));
      }
      if (tableEditorIndentBtn) {
        tableEditorIndentBtn.addEventListener("click", () => runTableEditorMutation(() => changeTableEditorIndent(1), "Indent"));
      }
      if (tableEditorOutdentBtn) {
        tableEditorOutdentBtn.addEventListener("click", () => runTableEditorMutation(() => changeTableEditorIndent(-1), "Outdent"));
      }
      if (tableEditorBoldBtn) {
        tableEditorBoldBtn.addEventListener("click", boldTableEditorSelection);
      }
      if (tableEditorLeftBtn) {
        tableEditorLeftBtn.addEventListener("click", () => runTableEditorMutation(() => alignTableEditorCells("left"), "Align left"));
      }
      if (tableEditorCenterBtn) {
        tableEditorCenterBtn.addEventListener("click", () => runTableEditorMutation(() => alignTableEditorCells("center"), "Align center"));
      }
      if (tableEditorRightBtn) {
        tableEditorRightBtn.addEventListener("click", () => runTableEditorMutation(() => alignTableEditorCells("right"), "Align right"));
      }
      if (tableEditorDeleteRowBtn) {
        tableEditorDeleteRowBtn.addEventListener("click", () => runTableEditorMutation(deleteTableEditorRows, "Delete row"));
      }
      if (tableEditorDeleteColumnBtn) {
        tableEditorDeleteColumnBtn.addEventListener("click", () => runTableEditorMutation(deleteTableEditorColumns, "Delete column"));
      }
      if (tableEditorUndoBtn) {
        tableEditorUndoBtn.addEventListener("click", undoTableEditorChange);
      }
      if (tableEditorRedoBtn) {
        tableEditorRedoBtn.addEventListener("click", redoTableEditorChange);
      }
      [tableEditorNumber, tableEditorCaption, tableEditorUnit].forEach((field) => {
        if (field) {
          field.addEventListener("beforeinput", () => dismissPendingTableCaptionSuggestion(field));
          field.addEventListener("focus", () => {
            if (field.hasAttribute("data-caption-suggestion")) {
              field.select();
            }
          });
          field.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || !field.hasAttribute("data-caption-suggestion")) {
              return;
            }
            event.preventDefault();
            const type = field.getAttribute("data-caption-suggestion");
            const suggestionHost = field === tableEditorNumber ? tableEditorNumberSuggestion : field === tableEditorCaption ? tableEditorCaptionSuggestion : tableEditorUnitSuggestion;
            acceptTableCaptionSuggestion(type, field, suggestionHost);
            focusNextTableCaptionField(field);
          });
          field.addEventListener("input", () => {
            updateTableEditorCaption();
            const suggestionHost = field === tableEditorNumber ? tableEditorNumberSuggestion : field === tableEditorCaption ? tableEditorCaptionSuggestion : tableEditorUnitSuggestion;
            if (suggestionHost) {
              suggestionHost.hidden = Boolean(field.value.trim());
            }
            scheduleTableEditorHistoryCommit("Edit table caption");
          });
        }
      });
      [tableEditorComplexScoping, tableEditorFinancial, tableEditorFrench].forEach((field) => {
        if (field) {
          field.addEventListener("change", () => {
            const action = field === tableEditorComplexScoping ? "table.option.complexScoping" : field === tableEditorFinancial ? "table.option.financial" : "table.option.french";
            applyTableOptionChange(field, action);
            if (field === tableEditorComplexScoping && !field.checked) setTableEditorScopingMode(false);
          });
        }
      });
      optionHelpButtons.forEach((button) => {
        button.addEventListener("mouseenter", () => showOptionTooltip(button));
        button.addEventListener("focus", () => showOptionTooltip(button));
        button.addEventListener("mouseleave", () => {
          if (document.activeElement !== button) {
            hideOptionTooltip();
          }
        });
        button.addEventListener("blur", hideOptionTooltip);
      });
      const tableEditorPanel = tableEditorDialog.querySelector(".table-editor-panel");
      if (tableEditorPanel) {
        tableEditorPanel.addEventListener("scroll", hideOptionTooltip);
      }
      window.addEventListener("resize", () => {
        hideOptionTooltip();
        updateTableEditorResizeHandle();
        updateTableEditorToastPosition();
      });
    }
    function focusNextTableCaptionField(field) {
      const fields = [tableEditorNumber, tableEditorCaption, tableEditorUnit].filter(Boolean);
      const fieldIndex = fields.indexOf(field);
      const nextField = fields[fieldIndex + 1] || tableEditorFinancial;
      if (nextField) {
        nextField.focus();
      }
    }
    function updateTableEditorToastPosition() {
      if (!toastRegion2 || !tableEditorDialog || tableEditorDialog.hidden) {
        return;
      }
      const editorRect = tableEditorDialog.getBoundingClientRect();
      toastRegion2.style.setProperty("--table-editor-toast-left", `${Math.round(editorRect.left + 16)}px`);
      toastRegion2.style.setProperty("--table-editor-toast-bottom", `${Math.round(window.innerHeight - editorRect.bottom + 14)}px`);
    }
    function getStoredTableEditorSize() {
      try {
        return uiPreferences2.get(tableEditorSizeStorageKey, {});
      } catch (error) {
        return {};
      }
    }
    function storeTableEditorSize(name, value) {
      const size = getStoredTableEditorSize();
      size[name] = Math.round(value);
      try {
        uiPreferences2.set(tableEditorSizeStorageKey, size);
      } catch (error) {
      }
    }
    function updateTableEditorResizeHandle() {
      if (!tableEditorDialog || !tableEditorResizeHandle) {
        return;
      }
      const { isBottomLayout, min, max } = getTableEditorSizeMetrics();
      const value = isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth;
      tableEditorResizeHandle.setAttribute("aria-orientation", isBottomLayout ? "horizontal" : "vertical");
      tableEditorResizeHandle.setAttribute("aria-valuemin", String(min));
      tableEditorResizeHandle.setAttribute("aria-valuemax", String(max));
      tableEditorResizeHandle.setAttribute("aria-valuenow", String(Math.round(value)));
      updateTableEditorSnapGuides();
    }
    function getTableEditorSizeMetrics() {
      const isBottomLayout = tableEditorBottomLayoutQuery.matches;
      const viewportSize = isBottomLayout ? window.innerHeight : window.innerWidth;
      const min = isBottomLayout ? Math.min(360, viewportSize - 24) : Math.min(600, viewportSize - 24);
      const max = Math.max(min, viewportSize - 24);
      const responsiveDefaultRatio = tableEditorMobileLayoutQuery.matches ? 0.72 : 0.86;
      const defaultSize = isBottomLayout ? Math.min(viewportSize * responsiveDefaultRatio, tableEditorMobileLayoutQuery.matches ? 760 : 920, max) : Math.min(980, max);
      return { isBottomLayout, viewportSize, min, max, defaultSize };
    }
    function getTableEditorSnapSizes(metrics = getTableEditorSizeMetrics()) {
      return [metrics.defaultSize, metrics.viewportSize * (2 / 3)].map((size) => Math.max(metrics.min, Math.min(size, metrics.max)));
    }
    function updateTableEditorSnapGuides() {
      const metrics = getTableEditorSizeMetrics();
      const sizes = getTableEditorSnapSizes(metrics);
      tableEditorSnapGuides.forEach((guide, index) => {
        const size = sizes[index];
        const duplicatesEarlierGuide = sizes.slice(0, index).some((otherSize) => Math.abs(otherSize - size) < 1);
        guide.hidden = duplicatesEarlierGuide;
        guide.style.setProperty("--table-editor-snap-position", `${metrics.viewportSize - size}px`);
      });
    }
    function snapTableEditorSize(value, metrics = getTableEditorSizeMetrics()) {
      const snapSize = getTableEditorSnapSizes(metrics).find((size) => Math.abs(value - size) <= tableEditorSnapZone);
      return snapSize === void 0 ? value : snapSize;
    }
    function showActiveTableEditorSnap(value) {
      const sizes = getTableEditorSnapSizes();
      tableEditorSnapGuides.forEach((guide, index) => {
        guide.classList.toggle("active", Math.abs(sizes[index] - value) < 1);
      });
    }
    function applyStoredTableEditorSize() {
      const size = getStoredTableEditorSize();
      if (Number.isFinite(size.width)) {
        tableEditorDialog.style.setProperty("--table-editor-width", `${size.width}px`);
      }
      if (Number.isFinite(size.height)) {
        tableEditorDialog.style.setProperty("--table-editor-height", `${size.height}px`);
      }
      updateTableEditorResizeHandle();
    }
    function setTableEditorSize(value) {
      const { isBottomLayout, min, max } = getTableEditorSizeMetrics();
      const nextValue = Math.max(min, Math.min(value, max));
      const name = isBottomLayout ? "height" : "width";
      tableEditorDialog.style.setProperty(`--table-editor-${name}`, `${nextValue}px`);
      tableEditorResizeHandle.setAttribute("aria-valuenow", String(Math.round(nextValue)));
      updateTableEditorToastPosition();
      return { name, value: nextValue };
    }
    function startTableEditorResize(event) {
      if (event.button !== 0 || tableEditorDialog.classList.contains("table-editor-fullscreen")) {
        return;
      }
      event.preventDefault();
      tableEditorResizeHandle.setPointerCapture(event.pointerId);
      tableEditorDialog.classList.add("table-editor-resizing");
      updateTableEditorSnapGuides();
      const resize = (moveEvent) => {
        const rawValue = tableEditorBottomLayoutQuery.matches ? window.innerHeight - moveEvent.clientY : window.innerWidth - moveEvent.clientX;
        const value = snapTableEditorSize(rawValue);
        setTableEditorSize(value);
        showActiveTableEditorSnap(value);
      };
      const finish = () => {
        tableEditorDialog.classList.remove("table-editor-resizing");
        showActiveTableEditorSnap(Number.NaN);
        tableEditorResizeHandle.removeEventListener("pointermove", resize);
        tableEditorResizeHandle.removeEventListener("pointerup", finish);
        tableEditorResizeHandle.removeEventListener("pointercancel", finish);
        tableEditorResizeHandle.removeEventListener("lostpointercapture", finish);
        const isBottomLayout = tableEditorBottomLayoutQuery.matches;
        storeTableEditorSize(isBottomLayout ? "height" : "width", isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth);
      };
      tableEditorResizeHandle.addEventListener("pointermove", resize);
      tableEditorResizeHandle.addEventListener("pointerup", finish);
      tableEditorResizeHandle.addEventListener("pointercancel", finish);
      tableEditorResizeHandle.addEventListener("lostpointercapture", finish);
    }
    function handleTableEditorResizeKeydown(event) {
      const isBottomLayout = tableEditorBottomLayoutQuery.matches;
      const direction = isBottomLayout ? { ArrowUp: 1, ArrowDown: -1 }[event.key] : { ArrowLeft: 1, ArrowRight: -1 }[event.key];
      if (!direction) {
        return;
      }
      event.preventDefault();
      const current = isBottomLayout ? tableEditorDialog.offsetHeight : tableEditorDialog.offsetWidth;
      const result = setTableEditorSize(current + direction * (event.shiftKey ? 50 : 10));
      storeTableEditorSize(result.name, result.value);
    }
    function toggleTableEditorFullscreen() {
      const fullscreen = tableEditorDialog.classList.toggle("table-editor-fullscreen");
      tableEditorFullscreenBtn.setAttribute("aria-pressed", String(fullscreen));
      tableEditorFullscreenBtn.textContent = fullscreen ? "Exit fullscreen" : "Fullscreen";
      updateTableEditorResizeHandle();
      updateTableEditorToastPosition();
    }
    function showOptionTooltip(button) {
      if (!optionTooltip || !button) {
        return;
      }
      optionTooltip.textContent = button.dataset.tooltip || "";
      optionTooltip.hidden = false;
      const buttonRect = button.getBoundingClientRect();
      const tooltipRect = optionTooltip.getBoundingClientRect();
      const viewportPadding = 8;
      const centeredLeft = buttonRect.left + (buttonRect.width - tooltipRect.width) / 2;
      const maxLeft = window.innerWidth - tooltipRect.width - viewportPadding;
      const left = Math.max(viewportPadding, Math.min(centeredLeft, maxLeft));
      const above = buttonRect.top - tooltipRect.height - viewportPadding;
      const preferredTop = above >= viewportPadding ? above : buttonRect.bottom + viewportPadding;
      const maxTop = window.innerHeight - tooltipRect.height - viewportPadding;
      const top = Math.max(viewportPadding, Math.min(preferredTop, maxTop));
      optionTooltip.style.left = `${left}px`;
      optionTooltip.style.top = `${top}px`;
    }
    function hideOptionTooltip() {
      if (optionTooltip) {
        optionTooltip.hidden = true;
      }
    }
    function commitTableChangesPreservingLiveScroll() {
      runPreservingElementScroll(liveEditor2, commitTableChanges);
    }
    function openTableEditor(index = 0, options = {}) {
      const items = getTableEditorItems();
      if (!tableEditorDialog || items.length === 0) {
        addProcessingLog2("No tables available to edit.", "warning");
        return;
      }
      tableEditorPreviewCleanup = options.previewCleanup !== false;
      tableEditorPreviousFocus = document.activeElement;
      tableEditorPreviousLiveScrollTop = liveEditor2 ? liveEditor2.scrollTop : null;
      tableEditorDialog.hidden = false;
      applyStoredTableEditorSize();
      if (toastRegion2) {
        toastRegion2.classList.add("table-editor-open");
        updateTableEditorToastPosition();
      }
      syncTableEditorFrenchOption();
      renderTableEditor(index);
      const firstSuggestedField = [tableEditorNumber, tableEditorCaption, tableEditorUnit].find((field) => field && field.hasAttribute("data-caption-suggestion"));
      const initialField = firstSuggestedField || tableEditorCaption;
      if (initialField) {
        initialField.focus();
      }
    }
    function closeTableEditor() {
      if (!tableEditorDialog || tableEditorDialog.hidden) {
        return;
      }
      tableEditorDialog.hidden = true;
      tableEditorDialog.classList.remove("table-editor-fullscreen");
      if (tableEditorFullscreenBtn) {
        tableEditorFullscreenBtn.setAttribute("aria-pressed", "false");
        tableEditorFullscreenBtn.textContent = "Fullscreen";
      }
      hideOptionTooltip();
      if (toastRegion2) {
        toastRegion2.classList.remove("table-editor-open");
      }
      if (tableEditorCanvas) {
        tableEditorCanvas.innerHTML = "";
      }
      setTableEditorScopingMode(false);
      tableEditorPreviewCleanup = false;
      if (tableEditorPreviousFocus && typeof tableEditorPreviousFocus.focus === "function") {
        tableEditorPreviousFocus.focus();
      }
      if (liveEditor2 && tableEditorPreviousLiveScrollTop !== null) {
        liveEditor2.scrollTop = tableEditorPreviousLiveScrollTop;
      }
      tableEditorPreviousFocus = null;
      tableEditorPreviousLiveScrollTop = null;
    }
    function removeEmptyFooterPlaceholder(event) {
      if (event.inputType !== "insertText" || event.data === null) {
        return;
      }
      const placeholder = getEmptyFooterPlaceholderAtSelection();
      if (!placeholder) {
        return;
      }
      event.preventDefault();
      replaceEmptyFooterPlaceholder(placeholder, event.data);
    }
    function replaceEmptyFooterPlaceholderOnPaste(event) {
      const placeholder = getEmptyFooterPlaceholderAtSelection();
      if (!placeholder || !event.clipboardData) {
        return;
      }
      event.preventDefault();
      replaceEmptyFooterPlaceholder(placeholder, event.clipboardData.getData("text/plain"));
    }
    function getEmptyFooterPlaceholderAtSelection() {
      const selection = getEditorSelection2(tableEditorCanvas);
      const placeholder = selection && selection.rangeCount > 0 ? getClosestElement2(selection.anchorNode, tableEditorCanvas, "tfoot p, tfoot td") : null;
      return placeholder && placeholder.textContent === "\xA0" ? placeholder : null;
    }
    function replaceEmptyFooterPlaceholder(paragraph, text) {
      paragraph.textContent = text;
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(false);
      const selection = getEditorSelection2(tableEditorCanvas);
      selection.removeAllRanges();
      selection.addRange(range);
      paragraph.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertText"
      }));
    }
    function handleTableEditorDialogKeydown(event) {
      if (!tableEditorDialog || tableEditorDialog.hidden) {
        return;
      }
      if (handleTableEditorHistoryShortcut(event)) {
        return;
      }
      const key = (event.key || "").toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === "b") {
        event.preventDefault();
        event.stopPropagation();
        boldTableEditorSelection();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleTableEditorEscape();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusableElements = getFocusableElements3(tableEditorDialog);
      if (focusableElements.length === 0) {
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
    function boldTableEditorSelection() {
      runTableEditorMutation(toggleTableEditorBold, "Bold");
    }
    function handleTableEditorHistoryShortcut(event) {
      const key = (event.key || "").toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "z" && event.shiftKey || key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey;
      if (!(event.ctrlKey || event.metaKey) || event.altKey || !isUndo && !isRedo) {
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      if (isRedo) {
        redoTableEditorChange();
      } else {
        undoTableEditorChange();
      }
      return true;
    }
    function getTableEditorSnapshot() {
      if (!tableEditorCanvas) {
        return null;
      }
      const clone = tableEditorCanvas.cloneNode(true);
      clearScopeVisualization(clone);
      clone.querySelectorAll(".selected").forEach((cell) => cell.classList.remove("selected"));
      return {
        html: clone.innerHTML,
        complexScoping: Boolean(tableEditorComplexScoping && tableEditorComplexScoping.checked),
        financial: Boolean(tableEditorFinancial && tableEditorFinancial.checked),
        french: Boolean(tableEditorFrench && tableEditorFrench.checked),
        acceptedExternalCaptionNodes: Array.from(tableEditorAcceptedExternalCaptionNodes)
      };
    }
    function tableEditorSnapshotsEqual(first, second) {
      if (!first || !second) {
        return false;
      }
      const firstAccepted = first.acceptedExternalCaptionNodes || [];
      const secondAccepted = second.acceptedExternalCaptionNodes || [];
      return first.html === second.html && first.complexScoping === second.complexScoping && first.financial === second.financial && first.french === second.french && firstAccepted.length === secondAccepted.length && firstAccepted.every((node) => secondAccepted.includes(node));
    }
    function resetTableEditorHistory() {
      window.clearTimeout(tableEditorHistoryTimer);
      tableEditorPendingAction = null;
      tableEditorHistory = [];
      tableEditorHistoryIndex = -1;
      commitTableEditorHistory("Open table editor");
    }
    function scheduleTableEditorHistoryCommit(actionLabel = "Edit table") {
      window.clearTimeout(tableEditorHistoryTimer);
      tableEditorPendingAction = actionLabel;
      tableEditorHistoryTimer = window.setTimeout(() => {
        commitTableEditorHistory(tableEditorPendingAction);
        tableEditorPendingAction = null;
      }, 350);
    }
    function runTableEditorMutation(callback, actionLabel) {
      window.clearTimeout(tableEditorHistoryTimer);
      commitTableEditorHistory(tableEditorPendingAction);
      tableEditorPendingAction = null;
      callback();
      commitTableEditorHistory(actionLabel);
    }
    function applyTableOptionChange(field, action) {
      const nextChecked = field.checked;
      window.clearTimeout(tableEditorHistoryTimer);
      field.checked = !nextChecked;
      commitTableEditorHistory(tableEditorPendingAction);
      tableEditorPendingAction = null;
      field.checked = nextChecked;
      recleanTableEditorTable();
      commitTableEditorHistory(action);
      showTableOptionToast(action, "Applied");
    }
    function commitTableEditorHistory(actionLabel = "Edit table") {
      if (tableEditorHistoryRestoring) {
        return;
      }
      window.clearTimeout(tableEditorHistoryTimer);
      const snapshot = getTableEditorSnapshot();
      if (!snapshot || tableEditorSnapshotsEqual(snapshot, tableEditorHistory[tableEditorHistoryIndex])) {
        return;
      }
      snapshot.action = actionLabel || "Edit table";
      tableEditorHistory.splice(tableEditorHistoryIndex + 1);
      tableEditorHistory.push(snapshot);
      if (tableEditorHistory.length > 100) {
        tableEditorHistory.shift();
      }
      tableEditorHistoryIndex = tableEditorHistory.length - 1;
      updateTableEditorHistoryButtons();
    }
    function undoTableEditorChange() {
      commitTableEditorHistory(tableEditorPendingAction);
      tableEditorPendingAction = null;
      if (tableEditorHistoryIndex <= 0) {
        return;
      }
      const undoneAction = tableEditorHistory[tableEditorHistoryIndex].action || "Edit table";
      restoreTableEditorHistory(tableEditorHistoryIndex - 1);
      restoreFocusAfterTableSuggestionUndo(undoneAction);
      if (!showTableOptionToast(undoneAction, "Undo")) {
        showActivityToast2(`Undid ${undoneAction}.`, "success", "Table undo");
      }
    }
    function restoreFocusAfterTableSuggestionUndo(action) {
      const match = /^Add suggested table (number|title|unit)$/.exec(action || "");
      if (!match) {
        return;
      }
      const field = match[1] === "number" ? tableEditorNumber : match[1] === "title" ? tableEditorCaption : tableEditorUnit;
      if (!field) {
        return;
      }
      field.focus();
      if (field.hasAttribute("data-caption-suggestion")) {
        field.select();
      }
    }
    function redoTableEditorChange() {
      if (tableEditorHistoryIndex >= tableEditorHistory.length - 1) {
        return;
      }
      const nextIndex = tableEditorHistoryIndex + 1;
      const redoneAction = tableEditorHistory[nextIndex].action || "Edit table";
      restoreTableEditorHistory(nextIndex);
      if (!showTableOptionToast(redoneAction, "Redo")) {
        showActivityToast2(`Redid ${redoneAction}.`, "success", "Table redo");
      }
    }
    function showTableOptionToast(action, phase) {
      const option = action === "table.option.financial" ? {
        name: "Financial table",
        enabled: Boolean(tableEditorFinancial && tableEditorFinancial.checked)
      } : action === "table.option.complexScoping" ? {
        name: "Complex scoping",
        enabled: Boolean(tableEditorComplexScoping && tableEditorComplexScoping.checked)
      } : action === "table.option.french" ? {
        name: "French number format",
        enabled: Boolean(tableEditorFrench && tableEditorFrench.checked)
      } : null;
      if (!option) {
        return false;
      }
      const state = option.enabled ? "on" : "off";
      showActivityToast2(`${phase}: ${option.name} turned ${state}.`, "success", "Table option");
      return true;
    }
    function restoreTableEditorHistory(index) {
      const snapshot = tableEditorHistory[index];
      if (!snapshot || !tableEditorCanvas) {
        return;
      }
      tableEditorHistoryRestoring = true;
      tableEditorHistoryIndex = index;
      tableEditorCanvas.innerHTML = snapshot.html;
      tableEditorScopeParent = null;
      if (tableEditorComplexScoping) {
        tableEditorComplexScoping.checked = snapshot.complexScoping;
      }
      if (tableEditorFinancial) {
        tableEditorFinancial.checked = snapshot.financial;
      }
      if (tableEditorFrench) {
        tableEditorFrench.checked = snapshot.french;
      }
      tableEditorAcceptedExternalCaptionNodes = new Set(snapshot.acceptedExternalCaptionNodes || []);
      tableEditorLastSelectedCell = null;
      loadTableEditorCaptionFields();
      loadTableEditorCaptionSuggestions(getTableEditorItems()[tableEditorIndex], false);
      tableEditorHistoryRestoring = false;
      updateTableEditorHistoryButtons();
      refreshScopeVisualization();
    }
    function updateTableEditorHistoryButtons() {
      if (tableEditorUndoBtn) {
        tableEditorUndoBtn.disabled = tableEditorHistoryIndex <= 0;
      }
      if (tableEditorRedoBtn) {
        tableEditorRedoBtn.disabled = tableEditorHistoryIndex >= tableEditorHistory.length - 1;
      }
    }
    function handleTableEditorEscape() {
      if (!tableEditorDialog || tableEditorDialog.hidden) {
        return;
      }
      if (getTableEditorSelectedCells().length > 0) {
        deselectTableEditorCells();
        return;
      }
      closeTableEditor();
    }
    function isConvertedComponentTable(table) {
      return Boolean((table == null ? void 0 : table.matches('[data-propel-component-source="true"]')) || (table == null ? void 0 : table.closest("figure.panel.panel-default, .component-text-version")));
    }
    function getEditableTables(root) {
      return Array.from((root == null ? void 0 : root.querySelectorAll("table")) || []).filter((table) => !isConvertedComponentTable(table));
    }
    function getTableEditorItems() {
      return getEditableTables(inputHTML3).map((table) => {
        return {
          table,
          container: table.closest("div.table-responsive") || table
        };
      });
    }
    function getLiveTableIndex(liveTable) {
      if (!liveEditor2 || !liveTable) {
        return 0;
      }
      return getEditableTables(liveEditor2).indexOf(liveTable);
    }
    function handleLiveEditorTableHover(event) {
      if (isLiveEditorSelectingText() || hasLiveEditorTextSelection()) {
        hideLiveTableEditPopover();
        return;
      }
      const table = getClosestElement2(event.target, liveEditor2, "table");
      if (!table || isConvertedComponentTable(table)) {
        hideLiveTableEditPopover();
        return;
      }
      liveTableEditTarget = table;
      positionLiveTableEditPopover();
    }
    function hasLiveEditorTextSelection() {
      const selection = getEditorSelection2(liveEditor2);
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return false;
      }
      return liveEditor2.contains(selection.anchorNode) || liveEditor2.contains(selection.focusNode);
    }
    function positionLiveTableEditPopover() {
      if (!liveEditor2 || !liveTableEditPopover || !liveTableEditTarget || !liveEditor2.contains(liveTableEditTarget)) {
        return;
      }
      const hostRect = liveEditorHost2.getBoundingClientRect();
      const tableRect = liveTableEditTarget.getBoundingClientRect();
      liveTableEditPopover.classList.add("visible");
      const top = Math.max(8, tableRect.top - hostRect.top + 8);
      const left = Math.max(8, tableRect.right - hostRect.left - liveTableEditPopover.offsetWidth - 8);
      liveTableEditPopover.style.top = `${top}px`;
      liveTableEditPopover.style.left = `${left}px`;
      if (liveTableComponentPopover) {
        liveTableComponentPopover.classList.add("visible");
        liveTableComponentPopover.style.top = `${top + liveTableEditPopover.offsetHeight + 6}px`;
        liveTableComponentPopover.style.left = `${Math.max(8, tableRect.right - hostRect.left - liveTableComponentPopover.offsetWidth - 8)}px`;
      }
    }
    function hideLiveTableEditPopover() {
      liveTableEditTarget = null;
      if (!liveTableEditPopover) {
        return;
      }
      liveTableEditPopover.classList.remove("visible");
      liveTableComponentPopover == null ? void 0 : liveTableComponentPopover.classList.remove("visible");
    }
    function openHoveredLiveTableEditor(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!liveTableEditTarget) {
        return;
      }
      syncLiveToInputHTML2();
      openTableEditor(getLiveTableIndex(liveTableEditTarget));
      hideLiveTableEditPopover();
    }
    function openHoveredLiveTableComponentLibrary(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!liveTableEditTarget || typeof openComponentLibraryForTable2 !== "function") return;
      const target = liveTableEditTarget;
      openComponentLibraryForTable2({
        html: target.outerHTML,
        anchor: liveTableComponentPopover,
        apply(convertedHTML) {
          target.outerHTML = convertedHTML;
          syncLiveToInputHTML2();
          commitTableChangesPreservingLiveScroll();
        }
      });
      liveTableEditTarget = null;
      liveTableEditPopover == null ? void 0 : liveTableEditPopover.classList.remove("visible");
      liveTableComponentPopover == null ? void 0 : liveTableComponentPopover.classList.remove("visible");
    }
    function renderTableEditor(index) {
      const items = getTableEditorItems();
      if (!tableEditorCanvas || items.length === 0) {
        return;
      }
      tableEditorIndex = Math.min(Math.max(index, 0), items.length - 1);
      const item = items[tableEditorIndex];
      const clone = item.container.cloneNode(true);
      preserveExistingHeaderRelationships(clone.matches("table") ? clone : clone.querySelector("table"));
      clone.querySelectorAll(".selected").forEach((element) => element.classList.remove("selected"));
      tableEditorCanvas.innerHTML = "";
      tableEditorCanvas.appendChild(clone);
      tableEditorScopeParent = null;
      const sourceTable = item.container.matches("table") ? item.container : item.container.querySelector("table");
      if (shouldRunInitialTableCleanup(sourceTable, tableEditorPreviewCleanup, isCleanedTable2)) {
        const table = getTableEditorTable();
        if (table) {
          cleanupTable2(table, getTableEditorOptions());
          applyCurrentTableScopes(table);
        }
      }
      loadTableEditorCaptionFields();
      loadTableEditorCaptionSuggestions(item);
      updateTableEditorStatus(items.length);
      resetTableEditorHistory();
      scrollLiveToTableEditorTable();
      refreshScopeVisualization();
    }
    function scrollLiveToTableEditorTable() {
      if (!liveEditor2) {
        return;
      }
      const liveTable = getEditableTables(liveEditor2)[tableEditorIndex];
      if (liveTable) {
        scrollLiveElementIntoView2(liveTable);
      }
    }
    function updateTableEditorStatus(tableCount = getTableEditorItems().length) {
      if (tableEditorStatus) {
        tableEditorStatus.textContent = `Table ${tableEditorIndex + 1} of ${tableCount}. Use the Live view Edit table button or double-click a table to edit it here.`;
      }
      if (tableEditorFirstBtn) {
        tableEditorFirstBtn.disabled = tableEditorIndex <= 0;
      }
      if (tableEditorPrevBtn) {
        tableEditorPrevBtn.disabled = tableEditorIndex <= 0;
      }
      if (tableEditorNextBtn) {
        tableEditorNextBtn.disabled = tableEditorIndex >= tableCount - 1;
      }
      if (tableEditorLastBtn) {
        tableEditorLastBtn.disabled = tableEditorIndex >= tableCount - 1;
      }
      if (tableEditorApplyNextBtn) {
        tableEditorApplyNextBtn.disabled = tableEditorIndex >= tableCount - 1;
        tableEditorApplyNextBtn.hidden = tableEditorIndex >= tableCount - 1;
      }
      renderTableEditorPagination(tableCount);
    }
    function renderTableEditorPagination(tableCount) {
      if (!tableEditorPages) {
        return;
      }
      tableEditorPages.innerHTML = "";
      let activeButton = null;
      for (let index = 0; index < tableCount; index++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "table-editor-page-btn";
        button.textContent = String(index + 1);
        button.setAttribute("aria-label", `Edit table ${index + 1}`);
        if (index === tableEditorIndex) {
          button.classList.add("active");
          button.setAttribute("aria-current", "page");
          activeButton = button;
        }
        button.addEventListener("click", () => {
          renderTableEditor(index);
        });
        tableEditorPages.appendChild(button);
      }
      if (activeButton) {
        requestAnimationFrame(() => {
          if (!activeButton.isConnected) {
            return;
          }
          const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          activeButton.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "nearest",
            inline: "nearest"
          });
        });
      }
    }
    function getTableEditorTable() {
      return tableEditorCanvas ? tableEditorCanvas.querySelector("table") : null;
    }
    function getTableEditorContainer() {
      if (!tableEditorCanvas) {
        return null;
      }
      return tableEditorCanvas.querySelector("div.table-responsive") || getTableEditorTable();
    }
    function loadTableEditorCaptionFields() {
      const table = getTableEditorTable();
      const caption = table ? table.querySelector(":scope > caption") : null;
      if (!tableEditorNumber || !tableEditorCaption || !tableEditorUnit) {
        return;
      }
      tableEditorNumber.value = "";
      tableEditorCaption.value = "";
      tableEditorUnit.value = "";
      if (!caption) {
        return;
      }
      const numberText = Array.from(caption.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.nodeValue).join(" ").trim();
      const strong = caption.querySelector("strong");
      const small = caption.querySelector("small");
      tableEditorNumber.value = numberText;
      tableEditorCaption.value = strong ? strong.textContent.trim() : "";
      tableEditorUnit.value = small ? small.textContent.trim() : "";
    }
    function loadTableEditorCaptionSuggestions(item, resetAcceptedNodes = true) {
      tableEditorCaptionSuggestions = findTableCaptionSuggestions(item);
      if (resetAcceptedNodes) {
        tableEditorAcceptedExternalCaptionNodes = /* @__PURE__ */ new Set();
      }
      renderTableCaptionSuggestion("number", tableEditorNumberSuggestion, tableEditorNumber);
      renderTableCaptionSuggestion("title", tableEditorCaptionSuggestion, tableEditorCaption);
      renderTableCaptionSuggestion("unit", tableEditorUnitSuggestion, tableEditorUnit);
    }
    function renderTableCaptionSuggestion(type, host, field) {
      if (!host || !field) {
        return;
      }
      const suggestion = tableEditorCaptionSuggestions[type];
      host.hidden = !suggestion || Boolean(field.value.trim());
      if (host.hidden) {
        field.removeAttribute("data-caption-suggestion");
        return;
      }
      field.value = suggestion.text;
      field.setAttribute("data-caption-suggestion", type);
      host.onclick = () => acceptTableCaptionSuggestion(type, field, host);
    }
    function dismissPendingTableCaptionSuggestion(field) {
      if (!field || !field.hasAttribute("data-caption-suggestion")) {
        return;
      }
      field.value = "";
      field.removeAttribute("data-caption-suggestion");
      const suggestionHost = field === tableEditorNumber ? tableEditorNumberSuggestion : field === tableEditorCaption ? tableEditorCaptionSuggestion : tableEditorUnitSuggestion;
      if (suggestionHost) {
        suggestionHost.hidden = true;
      }
    }
    function acceptTableCaptionSuggestion(type, field, host) {
      const suggestion = tableEditorCaptionSuggestions[type];
      if (!suggestion) {
        return;
      }
      field.value = suggestion.text;
      field.removeAttribute("data-caption-suggestion");
      if (suggestion.sourceType === "table") {
        const section = suggestion.node.parentElement;
        suggestion.node.remove();
        if (section && !section.querySelector("tr")) {
          section.remove();
        }
        recleanTableEditorTable();
      } else {
        tableEditorAcceptedExternalCaptionNodes.add(suggestion.node);
      }
      host.hidden = true;
      updateTableEditorCaption();
      commitTableEditorHistory(`Add suggested table ${type}`);
    }
    function findTableCaptionSuggestions(item) {
      const candidates = [];
      const table = getTableEditorTable();
      if (!item || !table) {
        return {};
      }
      let sibling = item.container.previousElementSibling;
      while (sibling && candidates.length < 3 && sibling.matches("p, h1, h2, h3, h4, h5, h6, div")) {
        const text = sibling.textContent.replace(/\s+/g, " ").trim();
        if (!text || sibling.querySelector("table")) {
          break;
        }
        candidates.unshift({ node: sibling, sourceType: "document", text });
        sibling = sibling.previousElementSibling;
      }
      Array.from(table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr")).slice(0, 3).forEach((row) => {
        const cells = row.querySelectorAll(":scope > th, :scope > td");
        if (cells.length !== 1) {
          return;
        }
        const text = cells[0].textContent.replace(/\s+/g, " ").trim();
        if (text) {
          candidates.push({ node: row, sourceType: "table", text });
        }
      });
      const suggestions = {};
      const groups = ["document", "table"].map((sourceType) => candidates.filter((candidate) => candidate.sourceType === sourceType));
      let fallbackUnit = null;
      for (const group of groups) {
        const classification = classifyTableCaptionLabels(group.map((candidate) => candidate.text));
        if (classification.unit !== void 0 && !fallbackUnit) {
          fallbackUnit = group[classification.unit];
        }
        if (classification.number === void 0) {
          continue;
        }
        suggestions.number = group[classification.number];
        if (classification.title !== void 0 && group[classification.title].text.length <= 240) {
          suggestions.title = group[classification.title];
        }
        if (classification.unit !== void 0) {
          suggestions.unit = group[classification.unit];
        }
        break;
      }
      suggestions.unit || (suggestions.unit = fallbackUnit);
      if (!suggestions.title && suggestions.unit) {
        suggestions.title = candidates.find((candidate) => candidate !== suggestions.unit && candidate.text.length <= 240);
      }
      return suggestions;
    }
    function updateTableEditorCaption() {
      const table = getTableEditorTable();
      if (!table) {
        return;
      }
      const numberValue = tableEditorNumber && !tableEditorNumber.hasAttribute("data-caption-suggestion") ? tableEditorNumber.value.trim() : "";
      const titleValue = tableEditorCaption && !tableEditorCaption.hasAttribute("data-caption-suggestion") ? tableEditorCaption.value.trim() : "";
      const unitValue = tableEditorUnit && !tableEditorUnit.hasAttribute("data-caption-suggestion") ? tableEditorUnit.value.trim() : "";
      let caption = table.querySelector(":scope > caption");
      if (!numberValue && !titleValue && !unitValue) {
        if (caption) {
          caption.remove();
        }
        return;
      }
      if (!caption) {
        caption = document.createElement("caption");
        caption.classList.add("text-left", "fnt-nrml");
        table.insertBefore(caption, table.firstElementChild);
      }
      caption.textContent = "";
      if (numberValue) {
        caption.appendChild(document.createTextNode(numberValue));
      }
      if (titleValue) {
        if (numberValue) {
          caption.appendChild(document.createElement("br"));
        }
        const strong = document.createElement("strong");
        strong.textContent = titleValue;
        caption.appendChild(strong);
      }
      if (unitValue) {
        if (numberValue || titleValue) {
          caption.appendChild(document.createElement("br"));
        }
        const small = document.createElement("small");
        small.textContent = unitValue;
        caption.appendChild(small);
      }
    }
    function handleTableEditorCanvasClick(event) {
      const cell = event.target && event.target.closest ? event.target.closest("th, td") : null;
      if (!cell || !tableEditorCanvas.contains(cell)) {
        return;
      }
      if (tableEditorScopingMode) {
        event.preventDefault();
        if (!tableEditorScopeParent && cell.tagName.toLowerCase() === "th") {
          tableEditorScopeParent = cell;
          refreshScopeVisualization();
          showActivityToast2("Parent selected. Paint child cells by clicking or dragging.", "success", "Scoping mode");
        } else if (cell === tableEditorScopeParent) {
          tableEditorScopeParent = null;
          refreshScopeVisualization();
        }
        return;
      }
      if (tableEditorIsDragging) {
        return;
      }
      if (event.shiftKey && tableEditorLastSelectedCell) {
        event.preventDefault();
        selectTableEditorCellRange(tableEditorLastSelectedCell, cell, event.metaKey || event.ctrlKey);
        tableEditorLastSelectedCell = cell;
        clearTableEditorTextSelectionForMultiCellSelection();
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
        deselectTableEditorCells(cell);
      }
      cell.classList.toggle("selected");
      tableEditorLastSelectedCell = cell;
      clearTableEditorTextSelectionForMultiCellSelection();
    }
    function handleTableEditorCanvasMouseDown(event) {
      const cell = event.target && event.target.closest ? event.target.closest("th, td") : null;
      if (!cell || !tableEditorCanvas.contains(cell)) {
        return;
      }
      if (tableEditorScopingMode) {
        event.preventDefault();
        if (!tableEditorScopeParent || cell === tableEditorScopeParent) return;
        tableEditorScopePaintEnabled = !hasHeaderRelationship(tableEditorScopeParent, cell);
        paintTableEditorScopeCell(cell);
        tableEditorDragStartCell = cell;
        tableEditorIsDragging = false;
        return;
      }
      tableEditorDragStartCell = cell;
      tableEditorIsDragging = false;
    }
    function handleTableEditorCanvasMouseOver(event) {
      const cell = event.target && event.target.closest ? event.target.closest("th, td") : null;
      if (!cell || !tableEditorDragStartCell || !tableEditorCanvas.contains(cell)) {
        return;
      }
      if (tableEditorScopingMode) {
        event.preventDefault();
        tableEditorIsDragging = true;
        paintTableEditorScopeCell(cell);
        return;
      }
      if (cell === tableEditorDragStartCell && !tableEditorIsDragging) {
        return;
      }
      event.preventDefault();
      tableEditorIsDragging = true;
      selectTableEditorCellRange(tableEditorDragStartCell, cell, false);
      tableEditorLastSelectedCell = cell;
      clearTableEditorTextSelectionForMultiCellSelection();
    }
    function handleTableEditorDocumentMouseUp() {
      const paintedScope = tableEditorScopingMode && tableEditorScopePaintEnabled !== null;
      tableEditorDragStartCell = null;
      tableEditorScopePaintEnabled = null;
      if (paintedScope) {
        commitTableEditorHistory("Paint scoping relationship");
        refreshScopeVisualization();
      }
      if (!tableEditorIsDragging) {
        return;
      }
      window.setTimeout(() => {
        tableEditorIsDragging = false;
        clearTableEditorTextSelectionForMultiCellSelection();
      }, 0);
    }
    function toggleTableEditorScopingMode() {
      setTableEditorScopingMode(!tableEditorScopingMode);
    }
    function setTableEditorScopingMode(enabled) {
      tableEditorScopingMode = Boolean(enabled);
      tableEditorScopeParent = null;
      tableEditorScopePaintEnabled = null;
      if (tableEditorScopingMode) {
        if (tableEditorComplexScoping && !tableEditorComplexScoping.checked) {
          tableEditorComplexScoping.checked = true;
          commitTableEditorHistory("Turn on complex scoping");
        }
        applyCurrentTableScopes(getTableEditorTable());
      }
      if (tableEditorScopingModeBtn) tableEditorScopingModeBtn.setAttribute("aria-pressed", String(tableEditorScopingMode));
      if (tableEditorCanvas) {
        tableEditorCanvas.classList.toggle("scoping-mode", tableEditorScopingMode);
        tableEditorCanvas.setAttribute("contenteditable", String(!tableEditorScopingMode));
        tableEditorCanvas.setAttribute("aria-label", tableEditorScopingMode ? "Table scoping editor. Select a parent header, then paint child cells." : "Editable table");
      }
      refreshScopeVisualization();
    }
    function paintTableEditorScopeCell(cell) {
      if (!tableEditorScopeParent || cell === tableEditorScopeParent) return;
      setManualHeaderRelationship(tableEditorScopeParent, cell, tableEditorScopePaintEnabled);
      refreshScopeVisualization();
    }
    function refreshScopeVisualization() {
      if (!tableEditorCanvas) return;
      clearScopeVisualization(tableEditorCanvas);
      if (!tableEditorScopingMode) return;
      const cells = Array.from(tableEditorCanvas.querySelectorAll("th, td"));
      if (!tableEditorScopeParent) {
        cells.filter((cell) => cell.tagName.toLowerCase() === "th").forEach((cell, index) => {
          cell.classList.add("scope-parent-candidate");
          cell.style.setProperty("--scope-color", getScopeColor(index));
        });
        return;
      }
      const headers = Array.from(tableEditorCanvas.querySelectorAll("th"));
      const color = getScopeColor(headers.indexOf(tableEditorScopeParent));
      cells.forEach((cell) => {
        cell.style.setProperty("--scope-color", color);
        cell.classList.add(hasHeaderRelationship(tableEditorScopeParent, cell) ? "scope-child" : "scope-unrelated");
      });
      tableEditorScopeParent.classList.remove("scope-child", "scope-unrelated");
      tableEditorScopeParent.classList.add("scope-parent");
    }
    function clearScopeVisualization(root) {
      root.querySelectorAll(".scope-parent, .scope-parent-candidate, .scope-child, .scope-unrelated").forEach((cell) => {
        cell.classList.remove("scope-parent", "scope-parent-candidate", "scope-child", "scope-unrelated");
        cell.style.removeProperty("--scope-color");
        if (!cell.getAttribute("style")) cell.removeAttribute("style");
      });
    }
    function getScopeColor(index) {
      const colors = ["#2563eb", "#7c3aed", "#db2777", "#c2410c", "#047857", "#0369a1"];
      return colors[Math.max(0, index) % colors.length];
    }
    function deselectTableEditorCells(exceptCell = null) {
      if (!tableEditorCanvas) {
        return;
      }
      tableEditorCanvas.querySelectorAll(".selected").forEach((selectedCell) => {
        if (selectedCell !== exceptCell) {
          selectedCell.classList.remove("selected");
        }
      });
      clearTableEditorTextSelectionForMultiCellSelection();
    }
    function selectTableEditorCellRange(startCell, endCell, preserveExisting) {
      const startPosition = getTableEditorCellPosition(startCell);
      const endPosition = getTableEditorCellPosition(endCell);
      if (!startPosition || !endPosition) {
        return;
      }
      if (!preserveExisting) {
        deselectTableEditorCells();
      }
      const minRow = Math.min(startPosition.row, endPosition.row);
      const maxRow = Math.max(startPosition.row, endPosition.row);
      const minColumn = Math.min(startPosition.column, endPosition.column);
      const maxColumn = Math.max(startPosition.column, endPosition.column);
      getTableEditorCellGrid().forEach((entry) => {
        if (entry.row >= minRow && entry.row <= maxRow && entry.column >= minColumn && entry.column <= maxColumn) {
          entry.cell.classList.add("selected");
        }
      });
      clearTableEditorTextSelectionForMultiCellSelection();
    }
    function clearTableEditorTextSelectionForMultiCellSelection() {
      if (getTableEditorSelectedCells().length <= 1) {
        return;
      }
      const selection = window.getSelection ? window.getSelection() : null;
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
    }
    function getTableEditorCellPosition(cell) {
      return getCellPosition(getTableEditorTable(), cell);
    }
    function getTableEditorCellGrid() {
      return buildCellGrid(getTableEditorTable());
    }
    function getTableEditorSelectedCells() {
      return tableEditorCanvas ? Array.from(tableEditorCanvas.querySelectorAll("th.selected, td.selected")) : [];
    }
    function getTableEditorSelectedRows() {
      const rows = /* @__PURE__ */ new Set();
      getTableEditorSelectedCells().forEach((cell) => {
        const row = cell.closest("tr");
        if (row) {
          rows.add(row);
        }
      });
      return Array.from(rows);
    }
    function getTableEditorOptions() {
      return {
        ...defaultTableCleanupOptions2,
        financialTable: tableEditorFinancial ? tableEditorFinancial.checked : defaultTableCleanupOptions2.financialTable,
        addScope: true,
        addTfoot: false,
        frenchNumbers: tableEditorFrench ? tableEditorFrench.checked : defaultTableCleanupOptions2.frenchNumbers
      };
    }
    function getTableEditorRefreshOptions() {
      return {
        ...getTableEditorOptions(),
        trim: false,
        removeBoldFromRowHeaders: false,
        removeAttributes: [],
        unwrapTags: []
      };
    }
    function recleanTableEditorTable() {
      const table = getTableEditorTable();
      if (!table) {
        return;
      }
      updateTableEditorCaption();
      cleanupTable2(table, getTableEditorRefreshOptions());
      applyCurrentTableScopes(table);
    }
    function applyCurrentTableScopes(table) {
      applyTableScopes(table, {
        complex: tableEditorComplexScoping ? tableEditorComplexScoping.checked : true,
        idRoot: inputHTML3,
        renameTag: renameTag3
      });
    }
    function toggleTableEditorHeaderRows() {
      const table = getTableEditorTable();
      if (!table) {
        return;
      }
      const tbody = table.querySelector("tbody") || table.appendChild(document.createElement("tbody"));
      let thead = table.querySelector("thead");
      if (!thead) {
        thead = document.createElement("thead");
        table.insertBefore(thead, tbody);
      }
      getTableEditorSelectedRows().forEach((row) => {
        if (row.closest("thead")) {
          row.classList.remove("bg-dark", "text-white");
          Array.from(row.querySelectorAll("th, td")).forEach((cell, index) => {
            const nextCell = index === 0 ? renameTag3(cell, "th") : renameTag3(cell, "td");
            if (index === 0) {
              nextCell.setAttribute("scope", "row");
            } else {
              nextCell.removeAttribute("scope");
            }
          });
          tbody.insertBefore(row, tbody.firstChild);
          return;
        }
        row.classList.add("bg-dark", "text-white");
        row.classList.remove("active");
        Array.from(row.querySelectorAll("th, td")).forEach((cell, index) => {
          const nextCell = renameTag3(cell, "th");
          nextCell.setAttribute("scope", "col");
          if (tableEditorFinancial && tableEditorFinancial.checked && index > 0) {
            nextCell.classList.add("text-right");
          } else if (index > 0) {
            nextCell.classList.remove("text-right");
          }
        });
        thead.appendChild(row);
      });
    }
    function toggleTableEditorActiveRows() {
      toggleRowsActive(getTableEditorSelectedRows());
    }
    function mergeTableEditorRows() {
      getTableEditorSelectedRows().forEach((row) => {
        Array.from(row.querySelectorAll("th, td")).forEach((cell) => cell.classList.add("selected"));
        mergeTableEditorCellsInRow(row);
      });
    }
    function mergeTableEditorSelectedCells() {
      getTableEditorSelectedRows().forEach(mergeTableEditorCellsInRow);
    }
    function mergeTableEditorCellsInRow(row) {
      const selectedCells = Array.from(row.querySelectorAll("th.selected, td.selected"));
      if (selectedCells.length <= 1) {
        return;
      }
      const firstCell = selectedCells[0];
      let colspan = Number(firstCell.getAttribute("colspan") || 1);
      let hasMergedContent = Boolean(firstCell.textContent.trim() || firstCell.querySelector("img, table, ul, ol, dl"));
      selectedCells.slice(1).forEach((cell) => {
        const hasCellContent = Boolean(cell.textContent.trim() || cell.querySelector("img, table, ul, ol, dl"));
        const mergedContent = document.createDocumentFragment();
        if (hasCellContent) {
          if (hasMergedContent) {
            mergedContent.appendChild(document.createElement("br"));
          }
          while (cell.firstChild) {
            mergedContent.appendChild(cell.firstChild);
          }
          firstCell.appendChild(mergedContent);
          hasMergedContent = true;
        }
        colspan += Number(cell.getAttribute("colspan") || 1);
        cell.remove();
      });
      firstCell.setAttribute("colspan", String(colspan));
      firstCell.classList.add("selected");
    }
    function addEmptyTableEditorFooter() {
      const table = getTableEditorTable();
      if (!table) {
        return;
      }
      const tfoot = ensureTableEditorTfoot(table);
      const footerRow = document.createElement("tr");
      const footerCell = document.createElement("td");
      footerRow.classList.add("small");
      footerCell.setAttribute("colspan", String(getTableEditorWidth(table)));
      if (tableEditorFinancial && tableEditorFinancial.checked) {
        footerCell.textContent = "\xA0";
      } else {
        const footerParagraph = document.createElement("p");
        footerParagraph.textContent = "\xA0";
        footerCell.appendChild(footerParagraph);
      }
      footerRow.appendChild(footerCell);
      tfoot.appendChild(footerRow);
    }
    function moveTableEditorRowsToFooter() {
      const table = getTableEditorTable();
      const selectedRows = getTableEditorSelectedRows();
      moveRowsToTableFooter(table, selectedRows);
    }
    function ensureTableEditorTfoot(table) {
      let tfoot = table.querySelector("tfoot");
      if (!tfoot) {
        tfoot = document.createElement("tfoot");
        table.appendChild(tfoot);
      }
      return tfoot;
    }
    function changeTableEditorIndent(direction) {
      const levels = ["mrgn-lft-md", "mrgn-lft-lg", "mrgn-lft-xl"];
      getTableEditorSelectedCells().forEach((cell) => {
        if (cell.tagName.toLowerCase() !== "th" || !cell.closest("tbody")) {
          return;
        }
        let wrapper = getTableEditorIndentWrapper(cell, levels);
        let currentIndex = wrapper ? levels.findIndex((className) => wrapper.classList.contains(className)) : -1;
        const nextIndex = Math.min(Math.max(currentIndex + direction, -1), levels.length - 1);
        if (nextIndex === -1) {
          if (wrapper) {
            unwrapTableEditorIndentWrapper(wrapper);
          }
          return;
        }
        if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.classList.add("text-left", "fnt-nrml");
          while (cell.firstChild) {
            wrapper.appendChild(cell.firstChild);
          }
          cell.appendChild(wrapper);
        }
        wrapper.classList.remove(...levels);
        wrapper.classList.add(levels[nextIndex], "text-left", "fnt-nrml");
      });
    }
    function getTableEditorIndentWrapper(cell, levels) {
      return Array.from(cell.children).find((child) => {
        return levels.some((className) => child.classList.contains(className));
      }) || null;
    }
    function unwrapTableEditorIndentWrapper(wrapper) {
      const parent = wrapper.parentNode;
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      wrapper.remove();
    }
    function getTableEditorWidth(table) {
      return Array.from(table.querySelectorAll("tr")).reduce((width, row) => {
        const rowWidth = Array.from(row.querySelectorAll("th, td")).reduce((total, cell) => {
          return total + Number(cell.getAttribute("colspan") || 1);
        }, 0);
        return Math.max(width, rowWidth);
      }, 1);
    }
    function toggleTableEditorBold() {
      toggleCellsBold(getTableEditorSelectedCells());
    }
    function alignTableEditorCells(alignment) {
      getTableEditorSelectedCells().forEach((cell) => {
        cell.classList.remove("text-center", "text-right");
        if (alignment === "center") {
          cell.classList.add("text-center");
        }
        if (alignment === "right") {
          cell.classList.add("text-right");
        }
      });
    }
    function deleteTableEditorRows() {
      getTableEditorSelectedRows().forEach((row) => row.remove());
    }
    function deleteTableEditorColumns() {
      const table = getTableEditorTable();
      const result = deleteSelectedTableColumns(table, getTableEditorSelectedCells());
      if (result.blocked) {
        showActivityToast2("A table must retain at least one column.", "warning", "Delete column");
        return;
      }
      if (!result.changed) return;
      deselectTableEditorCells();
      applyCurrentTableScopes(table);
    }
    function applyTableEditorChanges(moveNext) {
      const items = getTableEditorItems();
      const item = items[tableEditorIndex];
      const editedContainer = getTableEditorContainer();
      if (!item || !editedContainer) {
        return;
      }
      updateTableEditorCaption();
      applyCurrentTableScopes(getTableEditorTable());
      const cleanClone = editedContainer.cloneNode(true);
      clearScopeVisualization(cleanClone);
      cleanClone.querySelectorAll(MANUAL_SCOPE_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(",")).forEach((cell) => {
        MANUAL_SCOPE_ATTRIBUTES.forEach((attribute) => cell.removeAttribute(attribute));
      });
      cleanClone.querySelectorAll(".selected").forEach((element) => {
        element.classList.remove("selected");
        if (element.classList.length === 0) {
          element.removeAttribute("class");
        }
      });
      item.container.replaceWith(cleanClone);
      tableEditorAcceptedExternalCaptionNodes.forEach((node) => {
        if (node.parentNode) {
          node.remove();
        }
      });
      tableEditorAcceptedExternalCaptionNodes.clear();
      commitTableChangesPreservingLiveScroll();
      addProcessingLog2(`Applied edits to table ${tableEditorIndex + 1}.`, "success");
      if (moveNext && tableEditorIndex < getTableEditorItems().length - 1) {
        renderTableEditor(tableEditorIndex + 1);
        return;
      }
      closeTableEditor();
    }
    function openActiveTableComponentLibrary() {
      const item = getTableEditorItems()[tableEditorIndex];
      if (!item || typeof openComponentLibraryForTable2 !== "function") return;
      openComponentLibraryForTable2({
        html: item.container.outerHTML,
        anchor: tableEditorComponentBtn,
        apply(convertedHTML) {
          item.container.outerHTML = convertedHTML;
          commitTableChangesPreservingLiveScroll();
          const remainingItems = getTableEditorItems();
          if (remainingItems.length === 0) {
            closeTableEditor();
            return;
          }
          renderTableEditor(Math.min(tableEditorIndex, remainingItems.length - 1));
        }
      });
    }
    return {
      createListeners: createTableEditorListeners,
      open: openTableEditor,
      close: closeTableEditor,
      getLiveTableIndex,
      handleLiveTableHover: handleLiveEditorTableHover,
      positionLiveTablePopover: positionLiveTableEditPopover,
      hideLiveTablePopover: hideLiveTableEditPopover,
      openHoveredLiveTable: openHoveredLiveTableEditor,
      handleEscape: handleTableEditorEscape,
      handleHistoryShortcut: handleTableEditorHistoryShortcut,
      syncLanguage: syncTableEditorFrenchOption,
      updateToastPosition: updateTableEditorToastPosition,
      isOpen: () => Boolean(tableEditorDialog && !tableEditorDialog.hidden)
    };
  }

  // src/conversion/mammoth-adapter.js
  function readFileAsArrayBuffer(file2) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("File reading failed."));
      reader.readAsArrayBuffer(file2);
    });
  }
  function getMammothLibrary(globalObject = window) {
    const library = globalObject.mammoth;
    return library && typeof library.convertToHtml === "function" ? library : null;
  }
  async function convertWithMammoth(library, arrayBuffer) {
    if (!library) throw new Error("Mammoth is not loaded.");
    const result = await library.convertToHtml({ arrayBuffer });
    return Object.freeze({ html: result.value, messages: result.messages || [] });
  }

  // src/conversion/docx-language.js
  function getLanguageResultFromDocxXml(xmlParts, decodeXmlText = decodeBasicXmlText) {
    const documentCounts = getLanguageCountsFromXml(xmlParts.documentXml || "", decodeXmlText);
    const defaultLanguage = getDefaultDocxLanguage(xmlParts.stylesXml || "") || getDefaultDocxLanguage(xmlParts.settingsXml || "");
    const explicitLanguage = getExplicitDocumentLanguage(documentCounts, defaultLanguage);
    const language = explicitLanguage || defaultLanguage;
    return language ? { language, counts: documentCounts, defaultLanguage, explicitLanguage } : null;
  }
  function getExplicitDocumentLanguage(languageText, defaultLanguage) {
    const total = languageText.en + languageText.fr;
    if (total === 0) return null;
    const language = languageText.fr > languageText.en ? "fr" : "en";
    const winningCount = languageText[language];
    const winningShare = winningCount / total;
    if (!defaultLanguage) return total >= 200 && winningShare >= 0.75 ? language : null;
    if (language === defaultLanguage) return language;
    return winningCount >= 200 && winningShare >= 0.75 ? language : null;
  }
  function getDefaultDocxLanguage(xml) {
    const docDefaultsMatch = xml.match(/<w:docDefaults\b[\s\S]*?<\/w:docDefaults>/i);
    const defaultLanguage = getFirstPrimaryLanguageFromXml(docDefaultsMatch ? docDefaultsMatch[0] : "");
    if (defaultLanguage) return defaultLanguage;
    const themeLanguageMatch = xml.match(/<w:themeFontLang\b[^>]*>/i);
    return themeLanguageMatch ? getSupportedLanguageCode(getXmlAttribute(themeLanguageMatch[0], "w:val")) : null;
  }
  function getLanguageCountsFromXml(xml, decodeXmlText = decodeBasicXmlText) {
    const counts = { en: 0, fr: 0 };
    const paragraphPattern = /<w:p\b[\s\S]*?<\/w:p>/gi;
    const documentXml = stripNonBodyLanguageXml(xml);
    let paragraphMatch;
    while ((paragraphMatch = paragraphPattern.exec(documentXml)) !== null) {
      const paragraphXml = paragraphMatch[0];
      const paragraphLanguage = getFirstPrimaryLanguageFromXml(getFirstXmlBlock(paragraphXml, "w:pPr"));
      const runPattern = /<w:r\b[\s\S]*?<\/w:r>/gi;
      let runMatch;
      while ((runMatch = runPattern.exec(paragraphXml)) !== null) {
        const runXml = runMatch[0];
        const runLanguage = getFirstPrimaryLanguageFromXml(getFirstXmlBlock(runXml, "w:rPr")) || paragraphLanguage;
        if (runLanguage) counts[runLanguage] += getWordTextLength(runXml, decodeXmlText);
      }
    }
    return counts;
  }
  function getFirstPrimaryLanguageFromXml(xml) {
    const languageTagPattern = /<w:lang\b[^>]*>/gi;
    let tagMatch;
    while ((tagMatch = languageTagPattern.exec(xml)) !== null) {
      const language = getSupportedLanguageCode(getXmlAttribute(tagMatch[0], "w:val"));
      if (language) return language;
    }
    return null;
  }
  function stripNonBodyLanguageXml(xml) {
    return xml.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/gi, "").replace(/<w:pict\b[\s\S]*?<\/w:pict>/gi, "").replace(/<mc:AlternateContent\b[\s\S]*?<\/mc:AlternateContent>/gi, "").replace(/<w:object\b[\s\S]*?<\/w:object>/gi, "");
  }
  function getFirstXmlBlock(xml, tagName) {
    const match = xml.match(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, "i"));
    return match ? match[0] : "";
  }
  function getWordTextLength(xml, decodeXmlText) {
    const textPattern = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
    let textLength = 0;
    let textMatch;
    while ((textMatch = textPattern.exec(xml)) !== null) {
      textLength += decodeXmlText(textMatch[1]).trim().length;
    }
    return textLength;
  }
  function decodeBasicXmlText(text) {
    return text.replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16))).replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(parseInt(value, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  }
  function getXmlAttribute(tag, attributeName) {
    const match = tag.match(new RegExp(`\\s${attributeName}="([^"]+)"`, "i"));
    return match ? match[1] : "";
  }
  function getSupportedLanguageCode(languageCode) {
    const normalized = (languageCode || "").toLowerCase();
    if (normalized === "en" || normalized.startsWith("en-")) return "en";
    if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";
    return null;
  }

  // src/ui/storage.js
  function createJSONStorage(storage, namespace) {
    return {
      get(key, fallback = null) {
        try {
          const value = storage.getItem(`${namespace}.${key}`);
          return value === null ? fallback : JSON.parse(value);
        } catch (e) {
          return fallback;
        }
      },
      set(key, value) {
        try {
          storage.setItem(`${namespace}.${key}`, JSON.stringify(value));
          return true;
        } catch (e) {
          return false;
        }
      }
    };
  }

  // src/ui/onboarding.js
  var dismissalPreferenceKey = "onboardingDismissed";
  function createOnboardingController({ card, blankButton, preferences }) {
    let dismissed = (preferences == null ? void 0 : preferences.get(dismissalPreferenceKey, false)) === true;
    function update(hasFile = false) {
      if (card) {
        card.hidden = hasFile || dismissed;
      }
    }
    function dismiss() {
      dismissed = true;
      preferences == null ? void 0 : preferences.set(dismissalPreferenceKey, true);
      update(false);
    }
    function bind() {
      blankButton == null ? void 0 : blankButton.addEventListener("click", dismiss);
      update(false);
    }
    return { bind, update };
  }

  // src/ui/wet-live-editor.js
  function createWetLiveEditor(host) {
    if (!host) {
      return null;
    }
    const placeholder = host.getAttribute("data-placeholder") || "";
    host.removeAttribute("contenteditable");
    host.removeAttribute("role");
    host.removeAttribute("aria-multiline");
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
        <link rel="stylesheet" href="css/wet-boew.min.css">
        <link rel="stylesheet" href="css/theme.min.css">
        <style>
            * {
                box-sizing: border-box;
            }

            :host {
                display: block;
                position: relative;
                height: 100%;
                min-height: 0;
                background: #fff;
                color: #333;
            }

            .wet-live-editor {
                min-height: 100%;
                height: 100%;
                overflow: auto;
                padding: 16px;
                outline: none;
                background: #fff;
                color: #333;
                font-family: "Noto Sans", sans-serif;
                font-size: 16px;
                line-height: 1.4375;
                -webkit-user-select: text;
                user-select: text;
            }

            .wet-live-editor:empty::before {
                content: attr(data-placeholder);
                color: #6f6f6f;
            }

            .reciprocal-caret {
                position: absolute;
                z-index: 18;
                top: 0;
                left: 0;
                display: none;
                width: 2px;
                min-height: 1em;
                background: #2563eb;
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
                pointer-events: none;
                animation: reciprocal-caret-blink 1.05s steps(1, end) infinite;
            }

            .reciprocal-caret.visible { display: block; }

            @keyframes reciprocal-caret-blink {
                50% { opacity: 0; }
            }

            @media (prefers-reduced-motion: reduce) {
                .reciprocal-caret { animation: none; }
            }

            .wet-live-editor h1:first-child {
                margin-top: 0;
            }

            .wet-live-editor img {
                max-width: 100%;
                height: auto;
            }

            .wet-live-editor table,
            .wet-live-editor .table-responsive {
                transition: outline-color 0.15s ease, box-shadow 0.15s ease;
            }

            .wet-live-editor table:hover,
            .wet-live-editor .table-responsive:hover {
                outline: 2px solid rgba(37,87,214,0.58);
                outline-offset: 3px;
                box-shadow: 0 0 0 6px rgba(37,87,214,0.08);
            }

            .wet-live-editor .review-flagged-component {
                position: relative;
            }

            .wet-live-editor .review-flag-button {
                position: absolute;
                z-index: 12;
                top: -7px;
                left: -7px;
                display: grid;
                width: 14px;
                height: 14px;
                place-items: center;
                border: 1px solid #92400e;
                border-radius: 50%;
                background: #fff7ed;
                color: #b45309;
                font: 700 9px/1 sans-serif;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
                cursor: pointer;
                opacity: 0;
                pointer-events: none;
                transform: scale(0.88);
                transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                -webkit-user-select: none;
                user-select: none;
            }

            .wet-live-editor.review-flags-visible .review-flag-button {
                opacity: 0.6;
                pointer-events: auto;
            }

            .wet-live-editor.review-flags-visible .review-flag-button:hover,
            .wet-live-editor .review-flag-button:focus {
                opacity: 1;
                transform: scale(1);
                outline: 2px solid rgba(37, 87, 214, 0.45);
                outline-offset: 1px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.24);
            }

            .review-flag-count {
                position: absolute;
                top: -7px;
                right: -8px;
                min-width: 12px;
                height: 12px;
                padding: 0 3px;
                border-radius: 999px;
                background: #b45309;
                color: #fff;
                font: 700 8px/12px sans-serif;
                text-align: center;
            }

            .review-flag-button-error .review-flag-count {
                background: #b91c1c;
            }

            .wet-live-editor .review-flag-button-error {
                border-color: #991b1b;
                background: #fef2f2;
                color: #b91c1c;
            }

            .wet-live-editor .review-flag-target {
                animation: review-flag-pulse 0.8s ease-in-out 2;
            }

            @keyframes review-flag-pulse {
                50% { box-shadow: 0 0 0 7px rgba(180, 83, 9, 0.22); }
            }

            .table-edit-popover {
                position: absolute;
                z-index: 20;
                display: none;
                align-items: center;
                gap: 6px;
                min-height: 32px;
                padding: 5px 10px;
                border: 1px solid rgba(37,87,214,0.36);
                border-radius: 999px;
                background: #fff;
                color: #0f3557;
                font: 700 0.82rem/1.2 "Noto Sans", sans-serif;
                box-shadow: 0 10px 26px rgba(16, 24, 40, 0.18);
                cursor: pointer;
                -webkit-user-select: none;
                user-select: none;
            }

            .table-edit-popover.visible {
                display: inline-flex;
            }

            .table-edit-popover:hover,
            .table-edit-popover:focus {
                border-color: rgba(37,87,214,0.68);
                background: #eef4ff;
                outline: 2px solid rgba(37,87,214,0.24);
                outline-offset: 1px;
            }

            .table-edit-popover-icon {
                position: relative;
                display: inline-block;
                width: 15px;
                height: 15px;
                border: 1px solid currentColor;
                border-radius: 2px;
                background:
                    linear-gradient(currentColor, currentColor) 0 33% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 0 66% / 100% 1px no-repeat,
                    linear-gradient(currentColor, currentColor) 33% 0 / 1px 100% no-repeat,
                    linear-gradient(currentColor, currentColor) 66% 0 / 1px 100% no-repeat;
            }
        </style>
        <div id="wetLiveEditor" class="wet-live-editor" contenteditable="true" role="textbox" aria-multiline="true" tabindex="0"></div>
        <span id="liveReciprocalCaret" class="reciprocal-caret" aria-hidden="true"></span>
        <button type="button" id="tableEditPopover" class="table-edit-popover" aria-label="Edit table">
            <span class="table-edit-popover-icon" aria-hidden="true"></span>
            <span>Edit table</span>
        </button>
        <button type="button" id="tableComponentPopover" class="table-edit-popover table-component-popover" aria-label="Convert table to component">
            <span aria-hidden="true">\u25C7</span>
            <span>Convert</span>
        </button>
    `;
    const editor = shadow.getElementById("wetLiveEditor");
    editor.setAttribute("data-placeholder", placeholder);
    host.setAttribute("tabindex", "0");
    return editor;
  }
  function focusWetLiveEditorFromHost(event, host, editor) {
    var _a2;
    const focusTarget = ((_a2 = event == null ? void 0 : event.composedPath) == null ? void 0 : _a2.call(event)[0]) || (event == null ? void 0 : event.target);
    if (focusTarget === host) {
      editor == null ? void 0 : editor.focus();
    }
  }
  function isWetLiveEditorOverlayTarget(target, overlays) {
    return overlays.some((overlay) => Boolean(overlay && target && overlay.contains(target)));
  }

  // src/ui/drawers.js
  function createDrawerControllers({ activity, shortcuts, onActivityChange }) {
    let shortcutPreviousFocus = null;
    function isActivityOpen() {
      return Boolean(activity.panel && activity.panel.classList.contains("open"));
    }
    function setActivityOpen(isOpen) {
      var _a2;
      if (!activity.panel) return;
      activity.panel.classList.toggle("open", isOpen);
      activity.panel.setAttribute("aria-hidden", String(!isOpen));
      (_a2 = activity.toggleButton) == null ? void 0 : _a2.setAttribute("aria-expanded", String(isOpen));
      onActivityChange == null ? void 0 : onActivityChange(isOpen);
    }
    function handleActivityKeydown(event) {
      var _a2;
      if (event.key !== "Escape" || !isActivityOpen()) return;
      event.preventDefault();
      setActivityOpen(false);
      (_a2 = activity.toggleButton) == null ? void 0 : _a2.focus();
    }
    function updateShortcutPlatform() {
      var _a2;
      if (!shortcuts.dialog) return;
      const platform = ((_a2 = navigator.userAgentData) == null ? void 0 : _a2.platform) || navigator.platform || navigator.userAgent || "";
      const isApple = /mac|iphone|ipad|ipod/i.test(platform);
      const labels = isApple ? { primary: "Cmd", alternate: "Option" } : { primary: "Ctrl", alternate: "Alt" };
      shortcuts.dialog.querySelectorAll("[data-shortcut-key]").forEach((key) => {
        key.textContent = labels[key.dataset.shortcutKey];
      });
      shortcuts.dialog.querySelectorAll("[data-shortcut-platform]").forEach((item) => {
        item.hidden = item.dataset.shortcutPlatform === "apple" ? !isApple : isApple;
      });
    }
    function selectCheatsheetTab(tabName, { focus = false } = {}) {
      if (!shortcuts.dialog) return;
      const tabs = Array.from(shortcuts.dialog.querySelectorAll("[data-cheatsheet-tab]"));
      const selectedTab = tabs.find((tab) => tab.dataset.cheatsheetTab === tabName) || tabs[0];
      if (!selectedTab) return;
      tabs.forEach((tab) => {
        const isSelected = tab === selectedTab;
        tab.setAttribute("aria-selected", String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
      });
      shortcuts.dialog.querySelectorAll("[data-cheatsheet-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.cheatsheetPanel !== selectedTab.dataset.cheatsheetTab;
      });
      if (focus) selectedTab.focus();
    }
    function handleCheatsheetTabKeydown(event) {
      const currentTab = event.target.closest("[data-cheatsheet-tab]");
      if (!currentTab || !shortcuts.dialog) return;
      const tabs = Array.from(shortcuts.dialog.querySelectorAll("[data-cheatsheet-tab]"));
      const currentIndex = tabs.indexOf(currentTab);
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      selectCheatsheetTab(tabs[nextIndex].dataset.cheatsheetTab, { focus: true });
    }
    function openShortcuts(tabName = null) {
      var _a2, _b, _c;
      if (!shortcuts.dialog) return;
      shortcutPreviousFocus = document.activeElement;
      if (tabName) selectCheatsheetTab(tabName);
      shortcuts.dialog.hidden = false;
      (_a2 = shortcuts.backdrop) == null ? void 0 : _a2.classList.add("open");
      (_b = shortcuts.toggleButton) == null ? void 0 : _b.setAttribute("aria-expanded", "true");
      (_c = shortcuts.closeButton) == null ? void 0 : _c.focus();
    }
    function closeShortcuts() {
      var _a2, _b, _c;
      if (!shortcuts.dialog || shortcuts.dialog.hidden) return;
      shortcuts.dialog.hidden = true;
      (_a2 = shortcuts.backdrop) == null ? void 0 : _a2.classList.remove("open");
      (_b = shortcuts.toggleButton) == null ? void 0 : _b.setAttribute("aria-expanded", "false");
      (_c = shortcutPreviousFocus == null ? void 0 : shortcutPreviousFocus.focus) == null ? void 0 : _c.call(shortcutPreviousFocus);
      shortcutPreviousFocus = null;
    }
    function handleShortcutKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeShortcuts();
        return;
      }
      if (event.key !== "Tab" || !shortcuts.dialog || shortcuts.dialog.hidden) return;
      const focusable = getFocusableElements(shortcuts.dialog);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    function bind() {
      var _a2, _b, _c, _d, _e, _f, _g, _h;
      (_a2 = activity.toggleButton) == null ? void 0 : _a2.addEventListener("click", () => setActivityOpen(!isActivityOpen()));
      (_b = activity.closeButton) == null ? void 0 : _b.addEventListener("click", () => setActivityOpen(false));
      document.addEventListener("keydown", handleActivityKeydown, true);
      (_c = shortcuts.toggleButton) == null ? void 0 : _c.addEventListener("click", () => openShortcuts());
      (_d = shortcuts.instructionsButton) == null ? void 0 : _d.addEventListener("click", () => openShortcuts("instructions"));
      (_e = shortcuts.closeButton) == null ? void 0 : _e.addEventListener("click", closeShortcuts);
      (_f = shortcuts.backdrop) == null ? void 0 : _f.addEventListener("click", closeShortcuts);
      (_g = shortcuts.dialog) == null ? void 0 : _g.addEventListener("keydown", handleShortcutKeydown);
      (_h = shortcuts.dialog) == null ? void 0 : _h.querySelectorAll("[data-cheatsheet-tab]").forEach((tab) => {
        tab.addEventListener("click", () => selectCheatsheetTab(tab.dataset.cheatsheetTab));
        tab.addEventListener("keydown", handleCheatsheetTabKeydown);
      });
      updateShortcutPlatform();
    }
    return {
      bind,
      activity: { isOpen: isActivityOpen, setOpen: setActivityOpen },
      shortcuts: { open: openShortcuts, close: closeShortcuts }
    };
  }
  function getFocusableElements(root) {
    return Array.from(root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
  }

  // src/ui/block-format.js
  var blockSelector = "h1, h2, h3, h4, h5, h6, p";
  var supportedBlockTags = /^(?:h[1-6]|p)$/;
  function applyBlockFormat(root, selection, targetTagName) {
    const normalizedTagName = String(targetTagName || "").toLowerCase();
    if (!root || !selection || selection.rangeCount === 0 || !supportedBlockTags.test(normalizedTagName)) {
      return [];
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      return [];
    }
    const blocks = Array.from(root.querySelectorAll(blockSelector));
    const startBlock = getBoundaryBlock(root, range.startContainer, range.startOffset, false);
    const endBlock = range.collapsed ? startBlock : getBoundaryBlock(root, range.endContainer, range.endOffset, true);
    const startIndex = blocks.indexOf(startBlock);
    const endIndex = blocks.indexOf(endBlock);
    if (startIndex < 0 || endIndex < startIndex) {
      return [];
    }
    return blocks.slice(startIndex, endIndex + 1).map((block) => renameTag2(block, normalizedTagName));
  }
  function getBoundaryBlock(root, container, offset, preferPrevious) {
    const closestBlock = getClosestBlock(root, container);
    if (closestBlock) {
      return closestBlock;
    }
    if (container.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const step = preferPrevious ? -1 : 1;
    for (let index = preferPrevious ? offset - 1 : offset; index >= 0 && index < container.childNodes.length; index += step) {
      const child = container.childNodes[index];
      const block = getClosestBlock(root, child) || getFirstBlock(child, preferPrevious);
      if (block) {
        return block;
      }
    }
    return null;
  }
  function getClosestBlock(root, node) {
    let element = node && node.nodeType === Node.ELEMENT_NODE ? node : node == null ? void 0 : node.parentElement;
    while (element && element !== root) {
      if (element.matches(blockSelector)) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
  function getFirstBlock(node, preferLast) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    if (node.matches(blockSelector)) {
      return node;
    }
    const matches = node.querySelectorAll(blockSelector);
    return preferLast ? matches[matches.length - 1] || null : matches[0] || null;
  }

  // src/app/editor-source-map.js
  var voidTags = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  function buildElementSourceMap(html) {
    const entries = [];
    const documentFrame = { path: null, childCount: 0, entry: null };
    const stack = [documentFrame];
    let index = 0;
    while (index < html.length) {
      const tagStart = html.indexOf("<", index);
      if (tagStart === -1) break;
      if (html.startsWith("<!--", tagStart)) {
        const commentEnd = html.indexOf("-->", tagStart + 4);
        index = commentEnd === -1 ? html.length : commentEnd + 3;
        continue;
      }
      const tagEnd = getTagEndIndex(html, tagStart);
      if (tagEnd === -1) break;
      const tagSource = html.slice(tagStart, tagEnd + 1);
      const tagMatch = tagSource.match(/^<\s*(\/?)\s*([A-Za-z][\w:-]*)/);
      if (!tagMatch) {
        index = tagEnd + 1;
        continue;
      }
      const tagName = tagMatch[2].toLowerCase();
      if (tagMatch[1] === "/") {
        closeSourceMapEntry(stack, tagName, tagStart, tagEnd + 1);
        index = tagEnd + 1;
        continue;
      }
      const parentFrame = stack[stack.length - 1] || documentFrame;
      const path = parentFrame.path === null ? [] : parentFrame.path.concat(parentFrame.childCount);
      parentFrame.childCount += 1;
      const isSelfClosing = /\/\s*>$/.test(tagSource) || voidTags.has(tagName);
      const entry = path.length === 0 ? null : {
        tagName,
        path,
        pathKey: path.join("."),
        startIndex: tagStart,
        openEndIndex: tagEnd + 1,
        closeStartIndex: tagEnd + 1,
        endIndex: tagEnd + 1
      };
      if (entry) entries.push(entry);
      if (!isSelfClosing) stack.push({ tagName, path, childCount: 0, entry });
      index = tagEnd + 1;
    }
    return entries;
  }
  function getElementPath(element, root) {
    if (!element || !root || element === root || !root.contains(element)) return null;
    const path = [];
    let current = element;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) return null;
      path.unshift(Array.from(parent.children).indexOf(current));
      current = parent;
    }
    return path;
  }
  function getElementByPath(root, path) {
    return path.reduce((current, index) => {
      var _a2;
      return ((_a2 = current == null ? void 0 : current.children) == null ? void 0 : _a2[index]) || null;
    }, root);
  }
  function closeSourceMapEntry(stack, tagName, closeStartIndex, endIndex) {
    for (let index = stack.length - 1; index > 0; index -= 1) {
      const frame = stack[index];
      stack.pop();
      if (frame.entry) {
        frame.entry.closeStartIndex = closeStartIndex;
        frame.entry.endIndex = endIndex;
      }
      if (frame.tagName === tagName) return;
    }
  }
  function getTagEndIndex(html, tagStart) {
    let quote = null;
    for (let index = tagStart + 1; index < html.length; index += 1) {
      const char = html[index];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        return index;
      }
    }
    return -1;
  }

  // src/app/reciprocal-caret.js
  function getSourceIndexForLiveCaret({ html, root, node, offset, entries, decodeEntity }) {
    const element = getCaretElement(node, root);
    const path = getElementPath(element, root);
    const entry = path && entries.find((candidate) => candidate.pathKey === path.join("."));
    if (!entry) return null;
    const range = root.ownerDocument.createRange();
    range.setStart(element, 0);
    try {
      range.setEnd(node, offset);
    } catch (e) {
      return entry.openEndIndex;
    }
    return getSourceIndexForTextOffset(
      html,
      entry.openEndIndex,
      entry.closeStartIndex,
      range.toString().length,
      decodeEntity
    );
  }
  function getLiveCaretForSourceIndex({ html, root, sourceIndex, entry, decodeEntity }) {
    const element = entry ? getElementByPath(root, entry.path) : null;
    if (!element) return null;
    const textOffset = getTextOffsetForSourceIndex(
      html,
      entry.openEndIndex,
      entry.closeStartIndex,
      sourceIndex,
      decodeEntity
    );
    const showText = root.ownerDocument.defaultView.NodeFilter.SHOW_TEXT;
    const walker = root.ownerDocument.createTreeWalker(element, showText);
    let remaining = textOffset;
    let textNode = walker.nextNode();
    while (textNode) {
      if (remaining <= textNode.data.length) return { node: textNode, offset: remaining };
      remaining -= textNode.data.length;
      textNode = walker.nextNode();
    }
    return { node: element, offset: element.childNodes.length };
  }
  function getSourceIndexForTextOffset(html, start, end, textOffset, decodeEntity = (value) => value) {
    let renderedLength = 0;
    let index = start;
    while (index < end) {
      if (html[index] === "<") {
        const tagEnd = findTagEnd(html, index, end);
        index = tagEnd === -1 ? end : tagEnd + 1;
        continue;
      }
      const token = getTextToken(html, index, end, decodeEntity);
      if (renderedLength + token.value.length >= textOffset) {
        return textOffset === renderedLength ? index : token.end;
      }
      renderedLength += token.value.length;
      index = token.end;
    }
    return end;
  }
  function getTextOffsetForSourceIndex(html, start, end, sourceIndex, decodeEntity = (value) => value) {
    const target = Math.max(start, Math.min(sourceIndex, end));
    let renderedLength = 0;
    let index = start;
    while (index < target) {
      if (html[index] === "<") {
        const tagEnd = findTagEnd(html, index, end);
        index = tagEnd === -1 ? end : tagEnd + 1;
        continue;
      }
      const token = getTextToken(html, index, end, decodeEntity);
      if (target < token.end) return renderedLength;
      renderedLength += token.value.length;
      index = token.end;
    }
    return renderedLength;
  }
  function getCaretElement(node, root) {
    const element = (node == null ? void 0 : node.nodeType) === Node.ELEMENT_NODE ? node : node == null ? void 0 : node.parentElement;
    if (!element || element === root || !root.contains(element)) return null;
    return element;
  }
  function getTextToken(html, index, end, decodeEntity) {
    if (html[index] === "&") {
      const entityEnd = html.indexOf(";", index + 1);
      if (entityEnd !== -1 && entityEnd < end) {
        const source = html.slice(index, entityEnd + 1);
        return { value: decodeEntity(source), end: entityEnd + 1 };
      }
    }
    return { value: html[index], end: index + 1 };
  }
  function findTagEnd(html, start, end) {
    let quote = null;
    for (let index = start + 1; index < end; index += 1) {
      const character = html[index];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === ">") {
        return index;
      }
    }
    return -1;
  }

  // src/preset-buttons.js
  var presetButtons = Object.freeze([
    {
      name: "Charts",
      tags: ["figcaption", "img"]
    },
    {
      name: "Tables",
      tags: ["table > caption", "table > tfoot", "table"]
    },
    {
      name: "Content",
      tags: ["h2", "h3", "h4", "h5", "h6", "p"]
    }
  ]);

  // src/propel.js
  var file = document.getElementById("file");
  var outputSection = document.getElementById("outputSection");
  var outputText2 = document.getElementById("outputText");
  var copyBtn = document.getElementById("copyBtn");
  var langBtn = document.getElementById("langBtn");
  var onThisPageBox = document.getElementById("onThisPageOption");
  var otpSettings = document.getElementById("otpSettings");
  var headerDepth = document.getElementById("headerDepth");
  var isToC = document.getElementById("isToC");
  var countBtn = document.getElementById("qaHelperCountBtn");
  var collapseBtn = document.getElementById("collapseBtn");
  var lightTheme = document.getElementById("lightTheme");
  var darkTheme = document.getElementById("darkTheme");
  var addIDsBtn = document.getElementById("addIDsBtn");
  var footnotesBtn = document.getElementById("footnotesBtn");
  var nbspBtn = document.getElementById("nbspBtn");
  var tableCleanupBtn = document.getElementById("tableCleanupBtn");
  var componentLibraryBtn = document.getElementById("componentLibraryBtn");
  var componentLibraryModal = document.getElementById("componentLibraryModal");
  var componentLibraryDialog = document.getElementById("componentLibraryDialog");
  var componentLibraryCloseBtn = document.getElementById("componentLibraryCloseBtn");
  var componentLibraryOptionsBtn = document.getElementById("componentLibraryOptionsBtn");
  var componentLibraryOptionsMenu = document.getElementById("componentLibraryOptionsMenu");
  var componentLibraryList = document.getElementById("componentLibraryList");
  var componentLibraryName = document.getElementById("componentLibraryName");
  var componentPreviewPanel = document.getElementById("componentPreviewPanel");
  var componentPreviewTitle = document.getElementById("componentPreviewTitle");
  var componentPreviewFrame = document.getElementById("componentPreviewFrame");
  var componentImportBtn = document.getElementById("componentImportBtn");
  var componentExportBtn = document.getElementById("componentExportBtn");
  var componentImportFile = document.getElementById("componentImportFile");
  var componentCreatorToggleBtn = document.getElementById("componentCreatorToggleBtn");
  var componentCreatorForm = document.getElementById("componentCreatorForm");
  var componentCreatorName = document.getElementById("componentCreatorName");
  var componentCreatorDescription = document.getElementById("componentCreatorDescription");
  var componentCreatorTemplate = document.getElementById("componentCreatorTemplate");
  var componentCreatorError = document.getElementById("componentCreatorError");
  var componentCreatorCancelBtn = document.getElementById("componentCreatorCancelBtn");
  var componentCreatorSaveBtn = document.getElementById("componentCreatorSaveBtn");
  var addIDsSettingsBtn = document.getElementById("addIDsSettingsBtn");
  var addIDsSettingsCloseBtn = document.getElementById("addIDsSettingsCloseBtn");
  var addIDsApplyBtn = document.getElementById("addIDsApplyBtn");
  var addIDsSettingsBackdrop = document.getElementById("addIDsSettingsBackdrop");
  var addIDsSettingsParent = otpSettings ? otpSettings.parentNode : null;
  var addIDsSettingsNextSibling = otpSettings ? otpSettings.nextSibling : null;
  var processingLog = document.getElementById("processingLog");
  var processingLogPanel = document.getElementById("processingLogPanel");
  var activityToggleBtn = document.getElementById("activityToggleBtn");
  var activityCloseBtn = document.getElementById("activityCloseBtn");
  var shortcutHelpBtn = document.getElementById("shortcutHelpBtn");
  var shortcutHelpDialog = document.getElementById("shortcutHelpDialog");
  var shortcutHelpCloseBtn = document.getElementById("shortcutHelpCloseBtn");
  var shortcutHelpBackdrop = document.getElementById("shortcutHelpBackdrop");
  var toastRegion = document.getElementById("toastRegion");
  var documentHealth = document.getElementById("documentHealth");
  var documentOutline = document.getElementById("documentOutline");
  var documentIssues = document.getElementById("documentIssues");
  var reviewFlagsToggle = document.getElementById("reviewFlagsToggle");
  var htmlPreview = document.getElementById("htmlPreview");
  var healthScore = document.getElementById("healthScore");
  var selectedOutlineType = "headings";
  var outlineTypes = {
    headings: { label: "Headings", selector: "h1, h2, h3, h4, h5, h6", empty: "No headings found yet." },
    tables: { label: "Tables", selector: "table", empty: "No tables found yet." },
    figures: { label: "Figures", selector: "figure", empty: "No figures found yet." },
    images: { label: "Images", selector: "img", empty: "No images found yet." },
    links: { label: "Links", selector: "a", empty: "No links found yet." },
    footnotes: { label: "Footnotes", selector: 'sup a, a[href^="#fn"], a[href^="#ftn"]', empty: "No footnotes found yet." }
  };
  var reviewTabs = document.querySelectorAll("[data-review-tab]");
  var workflowTabs = document.querySelectorAll("[data-workflow-tab]");
  var standardCleanupBtn = document.getElementById("standardCleanupBtn");
  var fileDropZone = document.getElementById("fileDropZone");
  var railUploadBtn = document.getElementById("railUploadBtn");
  var onboardingUploadBtn = document.getElementById("onboardingUploadBtn");
  var onboardingInstructionsBtn = document.getElementById("onboardingInstructionsBtn");
  var onboardingBlankBtn = document.getElementById("onboardingBlankBtn");
  var editorOnboarding = document.getElementById("editorOnboarding");
  var documentLoader = document.getElementById("loader");
  var liveEditorHost = document.getElementById("liveEditor");
  var liveEditor = createWetLiveEditor(liveEditorHost);
  var editorDropZone = document.getElementById("editorDropZone");
  var editorPanel = document.querySelector(".editor-panel");
  var paneSplitter = document.getElementById("paneSplitter");
  var paneSnapGuides = document.querySelectorAll(".pane-snap-guide");
  var codeEditor = document.getElementById("codeEditor");
  var codeHighlight = document.getElementById("codeHighlight");
  var codeReciprocalCaret = document.getElementById("codeReciprocalCaret");
  var liveReciprocalCaret = liveEditor == null ? void 0 : liveEditor.getRootNode().getElementById("liveReciprocalCaret");
  var editorViewButtons = document.querySelectorAll("[data-editor-view]");
  var wysiwygButtons = document.querySelectorAll("[data-edit-command]");
  var blockFormatSelect = document.getElementById("blockFormatSelect");
  var documentUndoBtn = document.getElementById("documentUndoBtn");
  var documentRedoBtn = document.getElementById("documentRedoBtn");
  var tableEditorElements = {
    liveTableEditPopover: liveEditor ? liveEditor.getRootNode().getElementById("tableEditPopover") : null,
    liveTableComponentPopover: liveEditor ? liveEditor.getRootNode().getElementById("tableComponentPopover") : null,
    tableEditorSnapGuides: document.querySelectorAll(".table-editor-snap-guide"),
    optionHelpButtons: document.querySelectorAll(".option-help[data-tooltip]"),
    toastRegion,
    ...Object.fromEntries([
      "tableEditorDialog",
      "tableEditorResizeHandle",
      "tableEditorFullscreenBtn",
      "tableEditorCloseBtn",
      "tableEditorCancelBtn",
      "tableEditorApplyBtn",
      "tableEditorComponentBtn",
      "tableEditorApplyNextBtn",
      "tableEditorFirstBtn",
      "tableEditorPrevBtn",
      "tableEditorNextBtn",
      "tableEditorLastBtn",
      "tableEditorPages",
      "tableEditorUndoBtn",
      "tableEditorRedoBtn",
      "tableEditorDeselectBtn",
      "tableEditorScopingModeBtn",
      "tableEditorHeaderBtn",
      "tableEditorMergeRowBtn",
      "tableEditorMergeCellsBtn",
      "tableEditorActiveBtn",
      "tableEditorAddFooterBtn",
      "tableEditorTfootBtn",
      "tableEditorIndentBtn",
      "tableEditorOutdentBtn",
      "tableEditorBoldBtn",
      "tableEditorLeftBtn",
      "tableEditorCenterBtn",
      "tableEditorRightBtn",
      "tableEditorDeleteRowBtn",
      "tableEditorDeleteColumnBtn",
      "tableEditorStatus",
      "tableEditorCanvas",
      "tableEditorNumber",
      "tableEditorCaption",
      "tableEditorUnit",
      "tableEditorNumberSuggestion",
      "tableEditorCaptionSuggestion",
      "tableEditorUnitSuggestion",
      "tableEditorComplexScoping",
      "tableEditorFinancial",
      "tableEditorFrench",
      "optionTooltip"
    ].map((id) => [id, document.getElementById(id)]))
  };
  var inputHTML2 = document.createElement("div");
  var documentStore = new DocumentStore(inputHTML2);
  var pendingTypingView = null;
  var deferredTypingRefresh = createDeferredWork(() => {
    const sourceView = pendingTypingView;
    pendingTypingView = null;
    if (sourceView === "live") {
      syncLiveToInputHTML();
      scheduleDocumentHistoryCommit("typing");
      updateCodeView();
      updateCodeReciprocalCaret();
    } else if (sourceView === "code") {
      syncEditorToInputHTML();
      scheduleDocumentHistoryCommit("typing");
      updateLiveView();
      updateCodeHighlight();
      updateLiveReciprocalCaret();
    }
    refreshReviewPanel();
  }, 500);
  function scheduleTypingRefresh(sourceView) {
    pendingTypingView = sourceView;
    deferredTypingRefresh.schedule();
  }
  function cancelPendingTypingRefresh() {
    if (pendingTypingView === null) return;
    pendingTypingView = null;
    deferredTypingRefresh.cancel();
  }
  var commandRegistry = new CommandRegistry().register("document.standardCleanup", { label: "Standard cleanup", execute: standardCleanupCommand }).register("document.addIds", { label: "Add IDs", execute: addIDsCommand }).register("document.generateFootnotes", { label: "Generate footnotes", execute: generateFootnotesCommand }).register("document.fixSpacing", { label: "Validate non-breaking spaces", execute: validateNbspCommand }).register("document.convertSelectionToComponent", { label: "Convert to component", execute: convertToComponentCommand }).register("table.openCleanup", { label: "Table cleanup", execute: tableCleanupCommand });
  var startTime;
  var endTime;
  var modifiedComponents = [];
  var headingIDCount;
  var tableIDCount;
  var figureIDCount = 0;
  var logCount = 0;
  var activeEditorView = "live";
  var elementSyncLineMap = [];
  var lastLiveSelectionRange = null;
  var lastCodeComponentChildPath = null;
  var lastLiveComponentChild = null;
  var livePaneWidthRatio = null;
  var liveEditorIsSelectingText = false;
  var documentHistory = [""];
  var documentHistoryActions = ["Initial state"];
  var documentHistoryIndex = 0;
  var documentHistoryTimer = null;
  var documentHistoryRestoring = false;
  var documentHistoryLastSource = null;
  var documentHistoryLastTime = 0;
  var activeDocumentCommandLabel = null;
  var uiPreferences = createJSONStorage(window.localStorage, "propel");
  var sessionPreferences = createJSONStorage(window.sessionStorage, "propel");
  var onboarding = createOnboardingController({
    card: editorOnboarding,
    blankButton: onboardingBlankBtn,
    preferences: sessionPreferences
  });
  var componentLibraryStorageKey = "componentLibrary";
  var activeComponentLibrary = loadComponentLibrary();
  var _a;
  var activeComponentId = ((_a = activeComponentLibrary.components[0]) == null ? void 0 : _a.id) || null;
  var pendingComponentSelection = null;
  var paneSplitterStorageKey = "livePaneWidthRatio";
  var paneSplitterSnapRatios = [1 / 2, 2 / 3];
  var paneSplitterSnapZone = 24;
  var isEngLang = true;
  var langStrings = engStrings;
  var tableEditor = createTableEditorController({
    elements: tableEditorElements,
    inputHTML: inputHTML2,
    liveEditor,
    liveEditorHost,
    uiPreferences,
    cleanupTable,
    isCleanedTable,
    defaultTableCleanupOptions,
    renameTag,
    getEditorSelection,
    getClosestElement,
    preserveParagraphsOnEnter,
    getFocusableElements: getFocusableElements2,
    addProcessingLog,
    showActivityToast,
    syncLiveToInputHTML,
    scrollLiveElementIntoView,
    commitTableChanges: () => {
      activeDocumentCommandLabel = "Apply table edits";
      updateOutputText();
    },
    openComponentLibraryForTable,
    isLiveEditorSelectingText: () => liveEditorIsSelectingText,
    isEnglish: () => isEngLang
  });
  var drawers = createDrawerControllers({
    activity: {
      panel: processingLogPanel,
      toggleButton: activityToggleBtn,
      closeButton: activityCloseBtn
    },
    shortcuts: {
      dialog: shortcutHelpDialog,
      toggleButton: shortcutHelpBtn,
      instructionsButton: onboardingInstructionsBtn,
      closeButton: shortcutHelpCloseBtn,
      backdrop: shortcutHelpBackdrop
    },
    onActivityChange: () => {
      updateLiveReviewFlagVisibility();
      tableEditor.updateToastPosition();
    }
  });
  createListeners();
  createModernDashboardListeners();
  drawers.bind();
  onboarding.bind();
  setUpPresetBtns(presetButtons);
  var tagText = document.getElementById("tagList");
  if (tagText) {
    tagText.value = qaHelperTagsDefault.trim();
  }
  refreshReviewPanel();
  renderComponentLibrary();
  updateLanguageSwitch();
  function createModernDashboardListeners() {
    reviewTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        switchReviewTab(tab.getAttribute("data-review-tab"));
      });
    });
    if (reviewFlagsToggle) {
      reviewFlagsToggle.addEventListener("change", updateLiveReviewFlagVisibility);
    }
    workflowTabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        const targetSelector = tab.getAttribute("href");
        const target = targetSelector ? document.querySelector(targetSelector) : null;
        if (!target) {
          return;
        }
        event.preventDefault();
        document.querySelectorAll("[data-workflow-tab]").forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    if (standardCleanupBtn) {
      standardCleanupBtn.addEventListener("click", () => commandRegistry.execute("document.standardCleanup"));
    }
    tableEditor.createListeners();
    document.addEventListener("keydown", handleGlobalKeydown);
    if (healthScore) {
      healthScore.addEventListener("click", openActivityReviewTab);
      healthScore.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        openActivityReviewTab();
      });
    }
    editorViewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        switchEditorView(button.getAttribute("data-editor-view"));
      });
    });
    wysiwygButtons.forEach((button) => {
      button.tabIndex = -1;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        runWysiwygCommand(button);
      });
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    if (blockFormatSelect) {
      blockFormatSelect.addEventListener("pointerdown", rememberLiveSelection);
      blockFormatSelect.addEventListener("focus", rememberLiveSelection);
      blockFormatSelect.addEventListener("change", () => {
        runBlockFormatCommand(blockFormatSelect.value);
      });
    }
    if (liveEditor) {
      if (liveEditorHost) {
        liveEditorHost.addEventListener("focus", (event) => {
          focusWetLiveEditorFromHost(event, liveEditorHost, liveEditor);
        });
      }
      liveEditor.addEventListener("focus", () => {
        activeEditorView = "live";
        hideReciprocalCaret(liveReciprocalCaret);
        rememberLiveSelection();
        updateBlockFormatSelect();
      });
      liveEditor.addEventListener("mouseup", () => {
        rememberLiveSelection();
        updateBlockFormatSelect();
        updateCodeReciprocalCaret();
      });
      liveEditor.addEventListener("keydown", handleLiveEditorKeydown);
      liveEditor.addEventListener("beforeinput", combineLiveEditorComponents);
      liveEditor.addEventListener("keyup", () => {
        rememberLiveSelection();
        updateBlockFormatSelect();
        updateCodeReciprocalCaret();
      });
      liveEditor.addEventListener("input", () => {
        scheduleTypingRefresh("live");
        rememberLiveSelection();
        updateBlockFormatSelect();
        hideReciprocalCaret(codeReciprocalCaret);
      });
      liveEditor.addEventListener("click", (event) => {
        scrollCodeToLiveElement(event.target);
      });
      liveEditor.addEventListener("mousedown", () => {
        liveEditorIsSelectingText = true;
        tableEditor.hideLiveTablePopover();
      });
      liveEditor.addEventListener("mouseup", () => {
        window.setTimeout(() => {
          liveEditorIsSelectingText = false;
        }, 0);
      });
      liveEditor.addEventListener("mousemove", tableEditor.handleLiveTableHover);
      liveEditor.addEventListener("scroll", () => {
        tableEditor.positionLiveTablePopover();
        if (activeEditorView === "code") updateLiveReciprocalCaret();
      });
      liveEditor.addEventListener("mouseleave", (event) => {
        const overlays = [tableEditorElements.liveTableEditPopover, tableEditorElements.liveTableComponentPopover];
        if (isWetLiveEditorOverlayTarget(event.relatedTarget, overlays)) {
          return;
        }
        tableEditor.hideLiveTablePopover();
      });
      if (tableEditorElements.liveTableEditPopover) {
        tableEditorElements.liveTableEditPopover.addEventListener("click", tableEditor.openHoveredLiveTable);
        tableEditorElements.liveTableEditPopover.addEventListener("mouseleave", (event) => {
          if (liveEditor.contains(event.relatedTarget)) {
            return;
          }
          tableEditor.hideLiveTablePopover();
        });
      }
      if (tableEditorElements.liveTableComponentPopover) {
        tableEditorElements.liveTableComponentPopover.addEventListener("mouseleave", (event) => {
          if (liveEditor.contains(event.relatedTarget)) return;
          tableEditor.hideLiveTablePopover();
        });
      }
      liveEditor.addEventListener("dblclick", (event) => {
        if (tableEditor.isOpen()) {
          return;
        }
        const table = getClosestElement(event.target, liveEditor, "table");
        if (!table) {
          return;
        }
        const tableIndex = tableEditor.getLiveTableIndex(table);
        if (tableIndex < 0) {
          return;
        }
        event.preventDefault();
        syncLiveToInputHTML();
        tableEditor.open(tableIndex);
      });
      liveEditor.addEventListener("blur", () => {
        deferredTypingRefresh.flush();
        hideReciprocalCaret(codeReciprocalCaret);
      });
    }
    document.addEventListener("selectionchange", () => {
      rememberLiveSelection();
      updateBlockFormatSelect();
    });
    if (editorDropZone && file) {
      ["dragenter", "dragover"].forEach((eventName) => {
        editorDropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (editorPanel) {
            editorPanel.classList.add("drag-active");
          }
        });
      });
      ["dragleave", "drop"].forEach((eventName) => {
        editorDropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (editorPanel) {
            editorPanel.classList.remove("drag-active");
          }
        });
      });
      editorDropZone.addEventListener("drop", handleFileDrop);
    }
    if (paneSplitter && editorDropZone) {
      applySavedPaneSplitterLocation();
      updatePaneSplitterOrientation();
      paneSplitter.addEventListener("pointerdown", startPaneResize);
      window.addEventListener("resize", () => {
        updatePaneSplitterOrientation();
        applyCurrentPaneSplitterLocation();
      });
    }
    if (fileDropZone && file) {
      ["dragenter", "dragover"].forEach((eventName) => {
        fileDropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          fileDropZone.classList.add("drag-active");
        });
      });
      ["dragleave", "drop"].forEach((eventName) => {
        fileDropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();
          fileDropZone.classList.remove("drag-active");
        });
      });
      fileDropZone.addEventListener("drop", handleFileDrop);
    }
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      document.addEventListener(eventName, (event) => {
        event.preventDefault();
      });
    });
  }
  function switchReviewTab(targetId) {
    if (!targetId) {
      return;
    }
    document.querySelectorAll(".review-tab").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-review-tab") === targetId);
    });
    document.querySelectorAll(".review-pane").forEach((pane) => {
      pane.classList.toggle("active", pane.id === targetId);
    });
    updateLiveReviewFlagVisibility();
  }
  function openActivityReviewTab() {
    drawers.activity.setOpen(true);
    switchReviewTab("issuesPane");
  }
  function getPaneResizeMetrics() {
    const rect = editorDropZone.getBoundingClientRect();
    const isStacked = isPaneSplitterStacked();
    const minPaneSize = 260;
    const splitterSize = isStacked ? paneSplitter.offsetHeight || 8 : paneSplitter.offsetWidth || 8;
    const liveToolbar = editorDropZone.querySelector(".wysiwyg-toolbar");
    const codeToolbar = editorDropZone.querySelector(".code-toolbar");
    const axisStart = isStacked ? liveToolbar.offsetHeight : 0;
    const toolbarSize = isStacked ? liveToolbar.offsetHeight + codeToolbar.offsetHeight : 0;
    const availableSize = (isStacked ? rect.height : rect.width) - splitterSize - toolbarSize;
    return {
      isStacked,
      minPaneSize,
      availableSize,
      axisStart,
      minRatio: minPaneSize / availableSize,
      maxRatio: (availableSize - minPaneSize) / availableSize
    };
  }
  function isPaneSplitterStacked() {
    return window.matchMedia("(orientation: portrait) and (min-width: 768px)").matches;
  }
  function updatePaneSplitterOrientation() {
    paneSplitter.setAttribute("aria-orientation", isPaneSplitterStacked() ? "horizontal" : "vertical");
    updatePaneSnapGuides();
  }
  function updatePaneSnapGuides() {
    const metrics = getPaneResizeMetrics();
    paneSnapGuides.forEach((guide) => {
      const ratio = Number(guide.dataset.snapRatio);
      const isAvailable = metrics.availableSize > 0 && ratio >= metrics.minRatio && ratio <= metrics.maxRatio;
      const position = metrics.axisStart + metrics.availableSize * ratio;
      guide.hidden = !isAvailable;
      guide.style.setProperty("--pane-snap-position", `${position}px`);
    });
  }
  function showActivePaneSnap(ratio) {
    paneSnapGuides.forEach((guide) => {
      const guideRatio = Number(guide.dataset.snapRatio);
      guide.classList.toggle("active", paneSplitterSnapRatios.includes(ratio) && Math.abs(guideRatio - ratio) < 1e-4);
    });
  }
  function clampPaneWidthRatio(ratio) {
    const metrics = getPaneResizeMetrics();
    if (!Number.isFinite(ratio) || metrics.availableSize <= 0 || metrics.availableSize <= metrics.minPaneSize * 2) {
      return null;
    }
    return Math.min(Math.max(ratio, metrics.minRatio), metrics.maxRatio);
  }
  function snapPaneWidthRatio(ratio, metrics) {
    if (!Number.isFinite(ratio) || metrics.availableSize <= 0) {
      return ratio;
    }
    const snapRatio = paneSplitterSnapRatios.find((targetRatio) => {
      const targetIsAvailable = targetRatio >= metrics.minRatio && targetRatio <= metrics.maxRatio;
      return targetIsAvailable && Math.abs(ratio - targetRatio) * metrics.availableSize <= paneSplitterSnapZone;
    });
    return snapRatio === void 0 ? ratio : snapRatio;
  }
  function setLivePaneWidthFromRatio(ratio) {
    const nextRatio = clampPaneWidthRatio(ratio);
    if (nextRatio === null) {
      return;
    }
    livePaneWidthRatio = nextRatio;
    const size = getPaneResizeMetrics().availableSize * nextRatio;
    editorDropZone.style.setProperty("--live-pane-width", `${size}px`);
  }
  function applySavedPaneSplitterLocation() {
    try {
      const savedRatio = uiPreferences.get(paneSplitterStorageKey);
      if (savedRatio !== null) {
        setLivePaneWidthFromRatio(Number(savedRatio));
      }
    } catch (error) {
      console.warn("Could not restore pane splitter location.", error);
    }
  }
  function applyCurrentPaneSplitterLocation() {
    if (livePaneWidthRatio !== null) {
      setLivePaneWidthFromRatio(livePaneWidthRatio);
    }
  }
  function savePaneSplitterLocation() {
    if (livePaneWidthRatio === null) {
      return;
    }
    try {
      uiPreferences.set(paneSplitterStorageKey, livePaneWidthRatio);
    } catch (error) {
      console.warn("Could not save pane splitter location.", error);
    }
  }
  function startPaneResize(event) {
    event.preventDefault();
    paneSplitter.setPointerCapture(event.pointerId);
    paneSplitter.classList.add("drag-active");
    editorDropZone.classList.add("pane-resizing");
    codeEditor == null ? void 0 : codeEditor.classList.add("is-resizing");
    updatePaneSnapGuides();
    const handleMove = (moveEvent) => {
      const rect = editorDropZone.getBoundingClientRect();
      const metrics = getPaneResizeMetrics();
      const pointerPosition = metrics.isStacked ? moveEvent.clientY - rect.top : moveEvent.clientX - rect.left;
      const rawSize = pointerPosition - metrics.axisStart;
      const nextSize = Math.min(Math.max(rawSize, metrics.minPaneSize), metrics.availableSize - metrics.minPaneSize);
      const nextRatio = snapPaneWidthRatio(nextSize / metrics.availableSize, metrics);
      setLivePaneWidthFromRatio(nextRatio);
      showActivePaneSnap(nextRatio);
    };
    const stopResize = () => {
      paneSplitter.classList.remove("drag-active");
      editorDropZone.classList.remove("pane-resizing");
      codeEditor == null ? void 0 : codeEditor.classList.remove("is-resizing");
      showActivePaneSnap(null);
      savePaneSplitterLocation();
      paneSplitter.removeEventListener("pointermove", handleMove);
      paneSplitter.removeEventListener("pointerup", stopResize);
      paneSplitter.removeEventListener("pointercancel", stopResize);
      paneSplitter.removeEventListener("lostpointercapture", stopResize);
    };
    paneSplitter.addEventListener("pointermove", handleMove);
    paneSplitter.addEventListener("pointerup", stopResize);
    paneSplitter.addEventListener("pointercancel", stopResize);
    paneSplitter.addEventListener("lostpointercapture", stopResize);
  }
  function createListeners() {
    if (file) {
      file.addEventListener("change", handleFileInputChange);
    }
    updateFileDropZoneState(false);
    [railUploadBtn, onboardingUploadBtn].forEach((button) => {
      if (button && file) {
        button.addEventListener("click", () => file.click());
      }
    });
    copyBtn.addEventListener("click", async () => {
      try {
        const html = getHTMLForCopy();
        await copyToClipboard(html);
        addProcessingLog("Copied HTML to clipboard.", "success");
      } catch (error) {
        console.error(error);
        addProcessingLog("Could not copy HTML to clipboard.", "error");
      }
    });
    langBtn.addEventListener("click", toggleLanguage);
    onThisPageBox.addEventListener("click", handleToggleOnThisPageBox);
    [onThisPageBox, headerDepth, isToC].forEach((control) => {
      if (control) {
        control.addEventListener("change", updateAddIDsSettingsState);
      }
    });
    if (otpSettings) {
      [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
        if (!trigger) {
          return;
        }
        trigger.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleAddIDsSettings();
        });
      });
      if (addIDsApplyBtn) {
        addIDsApplyBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          commandRegistry.execute("document.addIds");
          closeAddIDsSettings();
        });
      }
      otpSettings.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      if (addIDsSettingsCloseBtn) {
        addIDsSettingsCloseBtn.addEventListener("click", () => {
          closeAddIDsSettings();
        });
      }
      if (addIDsSettingsBackdrop) {
        addIDsSettingsBackdrop.addEventListener("click", () => {
          closeAddIDsSettings();
        });
      }
      document.addEventListener("click", () => {
        closeAddIDsSettings();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeAddIDsSettings();
        }
      });
      window.addEventListener("resize", positionAddIDsSettings);
      document.addEventListener("scroll", positionAddIDsSettings, true);
    }
    updateAddIDsSettingsState();
    if (componentLibraryBtn && componentLibraryDialog) {
      componentLibraryBtn.addEventListener("pointerdown", captureComponentSelection);
      componentLibraryBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openComponentLibrary();
      });
      componentLibraryDialog.addEventListener("click", (event) => event.stopPropagation());
      componentPreviewPanel == null ? void 0 : componentPreviewPanel.addEventListener("click", (event) => event.stopPropagation());
      componentLibraryModal == null ? void 0 : componentLibraryModal.addEventListener("click", closeComponentLibrary);
      componentLibraryCloseBtn == null ? void 0 : componentLibraryCloseBtn.addEventListener("click", closeComponentLibrary);
      componentLibraryOptionsBtn == null ? void 0 : componentLibraryOptionsBtn.addEventListener("click", toggleComponentLibraryOptions);
      componentImportBtn == null ? void 0 : componentImportBtn.addEventListener("click", () => componentImportFile == null ? void 0 : componentImportFile.click());
      componentImportFile == null ? void 0 : componentImportFile.addEventListener("change", importComponentLibrary);
      componentExportBtn == null ? void 0 : componentExportBtn.addEventListener("click", exportComponentLibrary);
      componentCreatorToggleBtn == null ? void 0 : componentCreatorToggleBtn.addEventListener("click", toggleComponentCreator);
      componentCreatorCancelBtn == null ? void 0 : componentCreatorCancelBtn.addEventListener("click", closeComponentCreator);
      componentCreatorSaveBtn == null ? void 0 : componentCreatorSaveBtn.addEventListener("click", saveNewComponent);
      document.querySelectorAll("[data-component-snippet]").forEach((button) => {
        button.addEventListener("click", () => insertComponentSnippet(button.getAttribute("data-component-snippet") || ""));
      });
    }
    outputText2.addEventListener("input", () => {
      activeEditorView = "code";
      codeEditor == null ? void 0 : codeEditor.classList.add("is-typing");
      scheduleTypingRefresh("code");
      hideReciprocalCaret(liveReciprocalCaret);
    });
    outputText2.addEventListener("focus", () => {
      activeEditorView = "code";
      hideReciprocalCaret(codeReciprocalCaret);
    });
    outputText2.addEventListener("blur", () => {
      deferredTypingRefresh.flush();
      hideReciprocalCaret(liveReciprocalCaret);
    });
    outputText2.addEventListener("keydown", handleCodeEditorKeydown);
    outputText2.addEventListener("scroll", () => {
      syncCodeHighlightScroll();
      if (activeEditorView === "live") updateCodeReciprocalCaret();
    });
    outputText2.addEventListener("click", (event) => {
      scrollLiveToCodeClick(event);
      requestAnimationFrame(updateLiveReciprocalCaret);
    });
    outputText2.addEventListener("keyup", () => requestAnimationFrame(updateLiveReciprocalCaret));
    outputText2.addEventListener("select", () => requestAnimationFrame(updateLiveReciprocalCaret));
    document.addEventListener("pointerdown", (event) => {
      const path = event.composedPath ? event.composedPath() : [];
      const clickedLive = path.includes(liveEditor) || path.includes(liveEditorHost);
      const clickedCode = path.includes(outputText2) || path.includes(codeEditor);
      if (!clickedLive) hideReciprocalCaret(codeReciprocalCaret);
      if (!clickedCode) hideReciprocalCaret(liveReciprocalCaret);
      if (!clickedLive && !clickedCode) {
        hideReciprocalCaret(codeReciprocalCaret);
        hideReciprocalCaret(liveReciprocalCaret);
      }
    }, { capture: true });
    outputText2.addEventListener("change", updateInputHTML);
    [
      [standardCleanupBtn, "Standard cleanup"],
      [addIDsApplyBtn, "Add IDs"],
      [footnotesBtn, "Generate footnotes"],
      [nbspBtn, "Validate non-breaking spaces"]
    ].forEach(([button, commandLabel]) => {
      if (!button) {
        return;
      }
      button.addEventListener("click", () => {
        commitDocumentHistory("typing");
        activeDocumentCommandLabel = commandLabel;
        window.setTimeout(() => {
          if (activeDocumentCommandLabel === commandLabel) {
            activeDocumentCommandLabel = null;
          }
        }, 0);
      }, { capture: true });
    });
    if (documentUndoBtn) {
      documentUndoBtn.addEventListener("click", undoDocumentChange);
    }
    if (documentRedoBtn) {
      documentRedoBtn.addEventListener("click", redoDocumentChange);
    }
    footnotesBtn.addEventListener("click", () => commandRegistry.execute("document.generateFootnotes"));
    nbspBtn.addEventListener("click", () => commandRegistry.execute("document.fixSpacing"));
    tableCleanupBtn.addEventListener("click", () => commandRegistry.execute("table.openCleanup"));
    countBtn.addEventListener("click", qaHelperCount);
    collapseBtn.addEventListener("click", collapseAll);
    lightTheme.addEventListener("click", setCodeTheme);
    darkTheme.addEventListener("click", setCodeTheme);
  }
  function loadComponentLibrary() {
    const stored = uiPreferences.get(componentLibraryStorageKey);
    if (!stored) return defaultComponentLibrary;
    try {
      return parseComponentLibrary(JSON.stringify(stored));
    } catch (e) {
      return defaultComponentLibrary;
    }
  }
  function renderComponentLibrary() {
    var _a2;
    if (!componentLibraryList) return;
    componentLibraryName.textContent = activeComponentLibrary.name;
    if (!activeComponentLibrary.components.some((component) => component.id === activeComponentId)) {
      activeComponentId = ((_a2 = activeComponentLibrary.components[0]) == null ? void 0 : _a2.id) || null;
    }
    componentLibraryList.replaceChildren(...activeComponentLibrary.components.map((component) => {
      const card = document.createElement("section");
      card.className = "component-library-card";
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "component-library-delete-btn";
      deleteButton.title = `Delete ${component.name}`;
      deleteButton.setAttribute("aria-label", `Delete ${component.name}`);
      deleteButton.innerHTML = '<svg aria-hidden="true" focusable="false"><use href="#trash-can"></use></svg>';
      deleteButton.addEventListener("click", () => deleteComponent(component));
      const label = document.createElement("strong");
      label.textContent = component.name;
      const description = document.createElement("p");
      description.textContent = component.description || "";
      const actions = document.createElement("div");
      actions.className = "component-library-card-actions";
      const previewButton = document.createElement("button");
      previewButton.type = "button";
      previewButton.className = "btn btn-default btn-sm component-preview-button";
      previewButton.title = `Preview ${component.name}`;
      previewButton.setAttribute("aria-label", `Preview ${component.name}`);
      previewButton.innerHTML = '<svg viewBox="0 0 18 18" aria-hidden="true" focusable="false"><path d="M1.5 9s2.7-4.5 7.5-4.5S16.5 9 16.5 9 13.8 13.5 9 13.5 1.5 9 1.5 9Z"></path><circle cx="9" cy="9" r="2.25"></circle></svg>';
      previewButton.addEventListener("click", () => previewComponent(component));
      const convertButton = document.createElement("button");
      convertButton.type = "button";
      convertButton.className = "btn btn-primary btn-sm";
      convertButton.textContent = "Convert";
      convertButton.addEventListener("click", () => {
        activeComponentId = component.id;
        commandRegistry.execute("document.convertSelectionToComponent");
      });
      actions.append(previewButton, convertButton);
      card.append(deleteButton, label, description, actions);
      return card;
    }));
  }
  function getSelectedComponent() {
    return activeComponentLibrary.components.find((component) => component.id === activeComponentId) || null;
  }
  function deleteComponent(component) {
    var _a2;
    if (activeComponentLibrary.components.length <= 1) {
      showActivityToast("A component library must contain at least one component.", "warning");
      return;
    }
    if (!window.confirm(`Delete \u201C${component.name}\u201D from this component library?`)) return;
    const remainingComponents = activeComponentLibrary.components.filter((item) => item.id !== component.id);
    const nextLibrary = {
      format: activeComponentLibrary.format,
      version: activeComponentLibrary.version,
      name: activeComponentLibrary === defaultComponentLibrary ? "My component library" : activeComponentLibrary.name,
      components: remainingComponents
    };
    activeComponentLibrary = parseComponentLibrary(JSON.stringify(nextLibrary));
    activeComponentId = ((_a2 = remainingComponents[0]) == null ? void 0 : _a2.id) || null;
    uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
    renderComponentLibrary();
    showHighlightedContentPreview();
    addProcessingLog(`Deleted component \u201C${component.name}\u201D.`, "success");
  }
  function captureComponentSelection() {
    if (activeEditorView === "code") {
      pendingComponentSelection = {
        view: "code",
        start: outputText2.selectionStart,
        end: outputText2.selectionEnd,
        html: outputText2.value.slice(outputText2.selectionStart, outputText2.selectionEnd)
      };
      return;
    }
    const selection = getEditorSelection(liveEditor);
    const range = (selection == null ? void 0 : selection.rangeCount) ? selection.getRangeAt(0) : null;
    pendingComponentSelection = range && !range.collapsed && liveEditor.contains(range.commonAncestorContainer) ? { view: "live", range: range.cloneRange(), html: getRangeHTML(range) } : null;
  }
  function getRangeHTML(range) {
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  }
  function openComponentLibrary() {
    var _a2;
    if (!(pendingComponentSelection == null ? void 0 : pendingComponentSelection.html)) {
      addProcessingLog("Select text or HTML before opening the component library.", "warning");
      showActivityToast("Select content to convert first.", "warning");
      return;
    }
    componentLibraryModal.classList.add("open");
    componentLibraryBtn.setAttribute("aria-expanded", "true");
    showHighlightedContentPreview();
    (_a2 = componentLibraryList.querySelector("button")) == null ? void 0 : _a2.focus();
  }
  function openComponentLibraryForTable({ html, apply }) {
    pendingComponentSelection = { view: "table", html, apply };
    openComponentLibrary();
  }
  function closeComponentLibrary() {
    if (!(componentLibraryModal == null ? void 0 : componentLibraryModal.classList.contains("open"))) return;
    componentLibraryModal.classList.remove("open");
    componentLibraryBtn == null ? void 0 : componentLibraryBtn.setAttribute("aria-expanded", "false");
    closeComponentLibraryOptions();
    closeComponentCreator();
    hideComponentPreview();
  }
  function toggleComponentCreator() {
    if (!componentCreatorForm || !componentCreatorToggleBtn) return;
    const willOpen = componentCreatorForm.hidden;
    componentCreatorForm.hidden = !willOpen;
    componentCreatorToggleBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (willOpen) componentCreatorName == null ? void 0 : componentCreatorName.focus();
  }
  function closeComponentCreator() {
    if (componentCreatorForm) componentCreatorForm.hidden = true;
    componentCreatorToggleBtn == null ? void 0 : componentCreatorToggleBtn.setAttribute("aria-expanded", "false");
    if (componentCreatorError) {
      componentCreatorError.hidden = true;
      componentCreatorError.textContent = "";
    }
  }
  function insertComponentSnippet(snippet) {
    if (!componentCreatorTemplate) return;
    const start = componentCreatorTemplate.selectionStart;
    const end = componentCreatorTemplate.selectionEnd;
    componentCreatorTemplate.setRangeText(snippet, start, end, "end");
    componentCreatorTemplate.focus();
  }
  function getUniqueComponentId(name) {
    const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "component";
    const ids = new Set(activeComponentLibrary.components.map((component) => component.id));
    let id = base;
    let suffix = 2;
    while (ids.has(id)) id = `${base}-${suffix++}`;
    return id;
  }
  function saveNewComponent() {
    const name = (componentCreatorName == null ? void 0 : componentCreatorName.value.trim()) || "";
    const template = (componentCreatorTemplate == null ? void 0 : componentCreatorTemplate.value.trim()) || "";
    const component = {
      id: getUniqueComponentId(name),
      name,
      description: (componentCreatorDescription == null ? void 0 : componentCreatorDescription.value.trim()) || "",
      template
    };
    const nextLibrary = {
      format: activeComponentLibrary.format,
      version: activeComponentLibrary.version,
      name: activeComponentLibrary === defaultComponentLibrary ? "My component library" : activeComponentLibrary.name,
      components: [...activeComponentLibrary.components, component]
    };
    try {
      activeComponentLibrary = parseComponentLibrary(JSON.stringify(nextLibrary));
      activeComponentId = component.id;
      uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
      renderComponentLibrary();
      componentCreatorName.value = "";
      componentCreatorDescription.value = "";
      componentCreatorTemplate.value = "";
      closeComponentCreator();
      addProcessingLog(`Created component \u201C${component.name}\u201D.`, "success");
    } catch (error) {
      componentCreatorError.textContent = error.message;
      componentCreatorError.hidden = false;
    }
  }
  function toggleComponentLibraryOptions() {
    var _a2;
    if (!componentLibraryOptionsMenu || !componentLibraryOptionsBtn) return;
    const willOpen = componentLibraryOptionsMenu.hidden;
    componentLibraryOptionsMenu.hidden = !willOpen;
    componentLibraryOptionsBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (willOpen) (_a2 = componentLibraryOptionsMenu.querySelector("button")) == null ? void 0 : _a2.focus();
  }
  function closeComponentLibraryOptions() {
    if (componentLibraryOptionsMenu) componentLibraryOptionsMenu.hidden = true;
    componentLibraryOptionsBtn == null ? void 0 : componentLibraryOptionsBtn.setAttribute("aria-expanded", "false");
  }
  function previewComponent(component) {
    activeComponentId = component.id;
    if (!component || !(pendingComponentSelection == null ? void 0 : pendingComponentSelection.html) || !componentPreviewFrame) return;
    const converted = applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? "en" : "fr" });
    renderComponentPreview(converted, component.name);
  }
  function showHighlightedContentPreview() {
    if (!(pendingComponentSelection == null ? void 0 : pendingComponentSelection.html)) return;
    renderComponentPreview(pendingComponentSelection.html, "");
  }
  function renderComponentPreview(html, title) {
    if (componentPreviewTitle) componentPreviewTitle.textContent = title;
    componentPreviewFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="css/wet-boew.min.css"><link rel="stylesheet" href="css/theme.min.css"><style>body{margin:0;padding:12px;background:#fff;zoom:.70}.component-preview-root{max-width:100%}.component-preview-root img{max-width:100%;height:auto}</style></head><body><main class="component-preview-root">${html}</main></body></html>`;
  }
  function hideComponentPreview() {
    if (componentPreviewTitle) componentPreviewTitle.textContent = "";
    if (componentPreviewFrame) componentPreviewFrame.removeAttribute("srcdoc");
  }
  async function importComponentLibrary() {
    var _a2;
    const selectedFile = (_a2 = componentImportFile == null ? void 0 : componentImportFile.files) == null ? void 0 : _a2[0];
    if (!selectedFile) return;
    try {
      activeComponentLibrary = parseComponentLibrary(await selectedFile.text());
      uiPreferences.set(componentLibraryStorageKey, activeComponentLibrary);
      renderComponentLibrary();
      showHighlightedContentPreview();
      addProcessingLog(`Imported component library \u201C${activeComponentLibrary.name}\u201D with ${activeComponentLibrary.components.length} component(s).`, "success");
      closeComponentLibraryOptions();
    } catch (error) {
      addProcessingLog(`Could not import component library: ${error.message}`, "danger");
    } finally {
      componentImportFile.value = "";
    }
  }
  function exportComponentLibrary() {
    const blob = new Blob([serializeComponentLibrary(activeComponentLibrary)], { type: "application/json" });
    const link = document.createElement("a");
    const filename = activeComponentLibrary.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "component-library";
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    addProcessingLog(`Exported component library \u201C${activeComponentLibrary.name}\u201D.`, "success");
    closeComponentLibraryOptions();
  }
  function toggleLanguage() {
    setCommandLanguage(isEngLang ? "fr" : "en");
    addProcessingLog(`Language changed to ${langStrings["LANG_BTN"]}.`, "info");
  }
  function setCommandLanguage(language) {
    if (language !== "en" && language !== "fr") {
      return false;
    }
    const nextIsEngLang = language === "en";
    const changed = isEngLang !== nextIsEngLang;
    isEngLang = nextIsEngLang;
    langStrings = isEngLang ? engStrings : frStrings;
    updateLanguageSwitch();
    return changed;
  }
  function updateLanguageSwitch() {
    tableEditor.syncLanguage();
    if (!langBtn) {
      return;
    }
    langBtn.setAttribute("aria-checked", isEngLang ? "true" : "false");
    langBtn.setAttribute("aria-label", isEngLang ? "Command language: English" : "Command language: French");
    langBtn.querySelectorAll("[data-language-option]").forEach((option) => {
      option.classList.toggle("active", option.getAttribute("data-language-option") === (isEngLang ? "en" : "fr"));
    });
  }
  function switchEditorView(view) {
    if (!view || view === activeEditorView) {
      return;
    }
    syncActiveEditorToInputHTML();
    activeEditorView = view;
    document.querySelectorAll(".editor-view").forEach((editorView) => {
      editorView.classList.remove("active");
    });
    editorViewButtons.forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-editor-view") === view);
    });
    if (view === "code") {
      updateCodeView();
      if (codeEditor) {
        codeEditor.classList.add("active");
      }
      if (liveEditorHost) {
        liveEditorHost.classList.remove("active");
      }
      outputText2.focus();
      addProcessingLog("Switched to Code view.", "info");
      return;
    }
    updateLiveView();
    if (liveEditorHost) {
      liveEditorHost.classList.add("active");
    }
    if (liveEditor) {
      liveEditor.focus();
    }
    if (codeEditor) {
      codeEditor.classList.remove("active");
    }
    addProcessingLog("Switched to Live view.", "info");
  }
  function runWysiwygCommand(button) {
    if (!button) {
      return;
    }
    const command = button.getAttribute("data-edit-command");
    let value = button.getAttribute("data-edit-value") || null;
    if (command === "createLink") {
      value = prompt("Link URL");
      if (!value) {
        return;
      }
    }
    runLiveEditCommand(command, value, getWysiwygButtonLabel(button));
  }
  function runLiveEditCommand(command, value = null, label = "") {
    if (!liveEditor || !command) {
      return;
    }
    if (activeEditorView !== "live") {
      switchEditorView("live");
    }
    const selectionRange = getTextSelectionRange(liveEditor) || lastLiveSelectionRange;
    restoreTextSelectionRange(liveEditor, selectionRange);
    if ((command === "indent" || command === "outdent") && !getSelectedListItem(liveEditor)) {
      addProcessingLog("Place the cursor in a list item to change list indent.", "warning");
      return;
    }
    const selection = getEditorSelection(liveEditor);
    const formattedBlocks = command === "formatBlock" ? applyBlockFormat(liveEditor, selection, value) : [];
    if (formattedBlocks.length === 0) {
      document.execCommand(command, false, value);
    }
    restoreTextSelectionRange(liveEditor, selectionRange);
    syncLiveToInputHTML();
    updateCodeView();
    refreshReviewPanel();
    updateBlockFormatSelect();
    if (command === "bold") {
      restoreTextSelectionRange(liveEditor, selectionRange);
      requestAnimationFrame(() => {
        restoreTextSelectionRange(liveEditor, selectionRange);
      });
      setTimeout(() => {
        restoreTextSelectionRange(liveEditor, selectionRange);
      }, 0);
    }
    rememberLiveSelection();
    if (label && command !== "bold") {
      addProcessingLog(`Applied Live view edit: ${label}.`, "info");
    }
  }
  function runBlockFormatCommand(value) {
    if (!liveEditor || !value) {
      return;
    }
    if (activeEditorView !== "live") {
      switchEditorView("live");
    }
    runLiveEditCommand("formatBlock", value, getBlockFormatLabel(value));
  }
  function updateBlockFormatSelect() {
    if (!blockFormatSelect || !liveEditor) {
      return;
    }
    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0 || !liveEditor.contains(selection.anchorNode)) {
      return;
    }
    blockFormatSelect.value = getCurrentBlockFormat(selection.anchorNode);
  }
  function getCurrentBlockFormat(node) {
    const block = getClosestElement(node, liveEditor, "h1, h2, h3, h4, h5, h6, p");
    return block ? block.tagName.toLowerCase() : "p";
  }
  function getBlockFormatLabel(value) {
    if (value === "p") {
      return "Paragraph";
    }
    return `Heading ${value.substring(1)}`;
  }
  function getWysiwygButtonLabel(button) {
    return button.getAttribute("aria-label") || button.getAttribute("title") || button.textContent.trim();
  }
  function handleLiveEditorKeydown(event) {
    var _a2;
    if (handleDocumentHistoryShortcut(event)) {
      return;
    }
    const selectionDirection = getComponentSelectionDirection(event);
    if (selectionDirection) {
      event.preventDefault();
      event.stopPropagation();
      selectLiveEditorComponent(selectionDirection);
      return;
    }
    preserveParagraphsOnEnter(event);
    const shortcut = getLiveEditorShortcut(event);
    if (!shortcut) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (shortcut.type === "formatBlock") {
      runBlockFormatCommand(shortcut.value);
      return;
    }
    if (shortcut.command === "createLink") {
      const value = prompt("Link URL");
      if (!value) {
        return;
      }
      runLiveEditCommand(shortcut.command, value, shortcut.label);
      return;
    }
    runLiveEditCommand(shortcut.command, (_a2 = shortcut.value) != null ? _a2 : null, shortcut.label);
  }
  function combineLiveEditorComponents(event) {
    if (!liveEditor || !event || event.defaultPrevented || !event.inputType) {
      return;
    }
    const isBackward = event.inputType === "deleteContentBackward";
    const isForward = event.inputType === "deleteContentForward";
    if (!isBackward && !isForward) {
      return;
    }
    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
      return;
    }
    const range = selection.getRangeAt(0);
    const component = getLiveEditorComponent(range.startContainer);
    if (!component || !isCaretAtComponentEdge(range, component, isBackward)) {
      return;
    }
    const sibling = isBackward ? component.previousElementSibling : component.nextElementSibling;
    if (!sibling) {
      return;
    }
    event.preventDefault();
    const target = isBackward ? sibling : component;
    const source = isBackward ? component : sibling;
    const joinRange = document.createRange();
    joinRange.selectNodeContents(target);
    joinRange.collapse(false);
    while (source.firstChild) {
      target.appendChild(source.firstChild);
    }
    source.remove();
    selection.removeAllRanges();
    selection.addRange(joinRange);
    syncLiveToInputHTML();
    updateCodeView();
    refreshReviewPanel();
    rememberLiveSelection();
    updateBlockFormatSelect();
  }
  function getLiveEditorComponent(node) {
    let component = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (component && component.parentElement !== liveEditor) {
      component = component.parentElement;
    }
    return component && component.parentElement === liveEditor ? component : null;
  }
  function isCaretAtComponentEdge(range, component, atStart) {
    const edgeRange = range.cloneRange();
    edgeRange.selectNodeContents(component);
    if (atStart) {
      edgeRange.setEnd(range.startContainer, range.startOffset);
    } else {
      edgeRange.setStart(range.startContainer, range.startOffset);
    }
    return edgeRange.collapsed || edgeRange.toString() === "";
  }
  function preserveParagraphsOnEnter(event) {
    if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    document.execCommand("formatBlock", false, "p");
    document.execCommand("insertParagraph", false, null);
  }
  function getLiveEditorShortcut(event) {
    const key = event.key ? event.key.toLowerCase() : "";
    const primaryKey = event.ctrlKey !== event.metaKey;
    const digit = getShortcutDigit(event);
    if (primaryKey && event.altKey && !event.shiftKey && digit !== null) {
      if (digit === "0") {
        return { type: "formatBlock", value: "p" };
      }
      return { type: "formatBlock", value: `h${digit}` };
    }
    if (primaryKey && !event.altKey && !event.shiftKey && key === "b") {
      return { command: "bold", label: "Bold" };
    }
    if (primaryKey && !event.altKey && !event.shiftKey && key === "i") {
      return { command: "italic", label: "Italic" };
    }
    if (primaryKey && !event.altKey && !event.shiftKey && key === "k") {
      return { command: "createLink", label: "Create link" };
    }
    if (primaryKey && !event.altKey && event.shiftKey && isShortcutDigit(event, "8")) {
      return { command: "insertUnorderedList", label: "Bulleted list" };
    }
    if (primaryKey && !event.altKey && event.shiftKey && isShortcutDigit(event, "7")) {
      return { command: "insertOrderedList", label: "Numbered list" };
    }
    if (primaryKey && !event.altKey && event.shiftKey && (key === " " || event.code === "Space")) {
      return { command: "insertHTML", value: "&nbsp;", label: "Non-breaking space" };
    }
    if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
      return {
        command: event.shiftKey ? "outdent" : "indent",
        label: event.shiftKey ? "Decrease list indent" : "Increase list indent"
      };
    }
    return null;
  }
  function handleCodeEditorKeydown(event) {
    if (handleDocumentHistoryShortcut(event)) {
      return;
    }
    const key = (event.key || "").toLowerCase();
    const selectionDirection = getComponentSelectionDirection(event);
    if (selectionDirection) {
      event.preventDefault();
      event.stopPropagation();
      activeEditorView = "code";
      selectCodeEditorComponent(selectionDirection);
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && (key === "w" || event.code === "KeyW")) {
      event.preventDefault();
      activeEditorView = "code";
      wrapCodeEditorSelectionWithTag();
      return;
    }
    if (event.ctrlKey !== event.metaKey && !event.altKey && event.shiftKey && (key === " " || event.code === "Space")) {
      event.preventDefault();
      event.stopPropagation();
      activeEditorView = "code";
      outputText2.setRangeText("&nbsp;", outputText2.selectionStart, outputText2.selectionEnd, "end");
      syncCodeEditorAfterProgrammaticEdit();
      scheduleDocumentHistoryCommit("typing");
      addProcessingLog("Inserted non-breaking space in Code view.", "info");
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    activeEditorView = "code";
    indentCodeEditorSelection(event.shiftKey ? -1 : 1);
    syncCodeEditorAfterProgrammaticEdit();
  }
  function getComponentSelectionDirection(event) {
    const hasPrimaryModifier = event.ctrlKey !== event.metaKey;
    if (!hasPrimaryModifier || event.altKey || event.shiftKey) {
      return null;
    }
    if (event.key === "[" || event.code === "BracketLeft") {
      return "parent";
    }
    if (event.key === "]" || event.code === "BracketRight") {
      return "child";
    }
    return null;
  }
  function selectCodeEditorComponent(direction) {
    if (!outputText2) {
      return;
    }
    if (elementSyncLineMap.length === 0) {
      updateElementSyncLineMap();
    }
    const start = outputText2.selectionStart || 0;
    const end = outputText2.selectionEnd || start;
    const selectedEntry = elementSyncLineMap.find(
      (entry) => entry.startIndex === start && entry.endIndex === end
    );
    const currentEntry = selectedEntry || getSyncEntryForCodeIndex(start);
    if (!currentEntry) {
      return;
    }
    let targetEntry = null;
    if (direction === "parent" && currentEntry.path.length > 1) {
      lastCodeComponentChildPath = currentEntry.path.slice();
      targetEntry = getCodeEntryForPath(currentEntry.path.slice(0, -1));
    } else if (direction === "child") {
      const rememberedChild = lastCodeComponentChildPath && lastCodeComponentChildPath.length === currentEntry.path.length + 1 && currentEntry.path.every((part, index) => part === lastCodeComponentChildPath[index]) ? getCodeEntryForPath(lastCodeComponentChildPath) : null;
      targetEntry = rememberedChild || elementSyncLineMap.find(
        (entry) => entry.path.length === currentEntry.path.length + 1 && currentEntry.path.every((part, index) => part === entry.path[index])
      );
    }
    if (!targetEntry) {
      return;
    }
    outputText2.setSelectionRange(targetEntry.startIndex, targetEntry.endIndex);
    scrollCodeToIndex(targetEntry.startIndex);
  }
  function selectLiveEditorComponent(direction) {
    const selection = getEditorSelection(liveEditor);
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    let current = getExactlySelectedElement(range) || (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement);
    if (!current || current === liveEditor || !liveEditor.contains(current)) {
      return;
    }
    let target = null;
    if (direction === "parent") {
      target = current.parentElement === liveEditor ? null : current.parentElement;
      if (target) {
        lastLiveComponentChild = current;
      }
    } else {
      const rememberedChild = lastLiveComponentChild && lastLiveComponentChild.parentElement === current && liveEditor.contains(lastLiveComponentChild) ? lastLiveComponentChild : null;
      target = rememberedChild || current.firstElementChild;
    }
    if (!target) {
      return;
    }
    const targetRange = document.createRange();
    targetRange.selectNode(target);
    selection.removeAllRanges();
    selection.addRange(targetRange);
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    rememberLiveSelection();
  }
  function getExactlySelectedElement(range) {
    if (!range || range.collapsed || range.startContainer !== range.endContainer || range.startContainer.nodeType !== Node.ELEMENT_NODE || range.endOffset !== range.startOffset + 1) {
      return null;
    }
    const selectedNode = range.startContainer.childNodes[range.startOffset];
    return selectedNode && selectedNode.nodeType === Node.ELEMENT_NODE ? selectedNode : null;
  }
  function handleDocumentHistoryShortcut(event) {
    const key = (event.key || "").toLowerCase();
    const isUndo = key === "z" && !event.shiftKey;
    const isRedo = key === "z" && event.shiftKey || key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey;
    if (!(event.ctrlKey || event.metaKey) || event.altKey || !isUndo && !isRedo) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    if (isRedo) {
      redoDocumentChange();
    } else {
      undoDocumentChange();
    }
    return true;
  }
  function scheduleDocumentHistoryCommit(source = "typing") {
    window.clearTimeout(documentHistoryTimer);
    documentHistoryTimer = window.setTimeout(() => commitDocumentHistory(source), 400);
  }
  function commitDocumentHistory(source = "command", actionLabel = null) {
    if (documentHistoryRestoring) {
      return;
    }
    window.clearTimeout(documentHistoryTimer);
    const html = inputHTML2.innerHTML;
    const now = Date.now();
    if (html === documentHistory[documentHistoryIndex]) {
      return;
    }
    const coalesceTyping = source === "typing" && documentHistoryLastSource === "typing" && now - documentHistoryLastTime < 1200;
    const historyAction = actionLabel || (source === "typing" ? "Edit document" : "Change document");
    if (coalesceTyping) {
      documentHistory[documentHistoryIndex] = html;
      documentHistoryActions[documentHistoryIndex] = historyAction;
    } else {
      documentHistory.splice(documentHistoryIndex + 1);
      documentHistoryActions.splice(documentHistoryIndex + 1);
      documentHistory.push(html);
      documentHistoryActions.push(historyAction);
      if (documentHistory.length > 100) {
        documentHistory.shift();
        documentHistoryActions.shift();
      }
      documentHistoryIndex = documentHistory.length - 1;
    }
    documentHistoryLastSource = source;
    documentHistoryLastTime = now;
    documentStore.touch(historyAction, { source });
    updateDocumentHistoryButtons();
  }
  function undoDocumentChange() {
    commitDocumentHistory("typing");
    if (documentHistoryIndex <= 0) {
      return;
    }
    const undoneAction = documentHistoryActions[documentHistoryIndex] || "Change document";
    restoreDocumentHistory(documentHistoryIndex - 1);
    showActivityToast(`Undid ${undoneAction}.`, "success", "Undo");
  }
  function redoDocumentChange() {
    if (documentHistoryIndex >= documentHistory.length - 1) {
      return;
    }
    const nextIndex = documentHistoryIndex + 1;
    const redoneAction = documentHistoryActions[nextIndex] || "Change document";
    restoreDocumentHistory(nextIndex);
    showActivityToast(`Redid ${redoneAction}.`, "success", "Redo");
  }
  function restoreDocumentHistory(index) {
    documentHistoryRestoring = true;
    documentHistoryIndex = index;
    documentStore.replaceHTML(documentHistory[index], { source: "history", historyIndex: index });
    inputHTML2.classList.add("content-area");
    updateCodeView();
    updateLiveView();
    refreshReviewPanel();
    documentHistoryRestoring = false;
    documentHistoryLastSource = "history";
    updateDocumentHistoryButtons();
  }
  function updateDocumentHistoryButtons() {
    if (documentUndoBtn) {
      documentUndoBtn.disabled = documentHistoryIndex <= 0;
    }
    if (documentRedoBtn) {
      documentRedoBtn.disabled = documentHistoryIndex >= documentHistory.length - 1;
    }
  }
  function wrapCodeEditorSelectionWithTag() {
    if (!outputText2) {
      return;
    }
    const tagInput = prompt("Wrap with HTML tag", "p");
    const tag = parseCodeEditorWrapTag(tagInput);
    if (!tag) {
      return;
    }
    const selectionStart = outputText2.selectionStart;
    const selectionEnd = outputText2.selectionEnd;
    const selectedText = outputText2.value.slice(selectionStart, selectionEnd);
    const openTag = tag.attributes ? `<${tag.name} ${tag.attributes}>` : `<${tag.name}>`;
    const closeTag = `</${tag.name}>`;
    const wrappedText = `${openTag}${selectedText}${closeTag}`;
    outputText2.setRangeText(wrappedText, selectionStart, selectionEnd, "end");
    if (!selectedText) {
      const cursor = selectionStart + openTag.length;
      outputText2.setSelectionRange(cursor, cursor);
    } else {
      outputText2.setSelectionRange(selectionStart, selectionStart + wrappedText.length);
    }
    syncCodeEditorAfterProgrammaticEdit();
  }
  function parseCodeEditorWrapTag(tagInput) {
    if (!tagInput) {
      return null;
    }
    const normalized = tagInput.trim().replace(/^<\s*/, "").replace(/\s*\/?>$/, "");
    const match = normalized.match(/^([A-Za-z][A-Za-z0-9-]*)(?:\s+([\s\S]+))?$/);
    if (!match) {
      return null;
    }
    return {
      name: match[1].toLowerCase(),
      attributes: match[2] ? match[2].trim() : ""
    };
  }
  function indentCodeEditorSelection(direction) {
    const indent = "    ";
    const value = outputText2.value;
    const selectionStart = outputText2.selectionStart;
    const selectionEnd = outputText2.selectionEnd;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = selectionEnd === selectionStart ? value.indexOf("\n", selectionEnd) : value.indexOf("\n", selectionEnd - 1);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    const selectedBlock = value.slice(lineStart, actualLineEnd);
    const lines = selectedBlock.split("\n");
    let removedBeforeSelection = 0;
    const nextLines = lines.map((line, index) => {
      if (direction > 0) {
        return `${indent}${line}`;
      }
      if (line.startsWith(indent)) {
        if (index === 0) {
          removedBeforeSelection = Math.min(indent.length, selectionStart - lineStart);
        }
        return line.slice(indent.length);
      }
      const leadingSpaces = line.match(/^ {1,3}/);
      if (leadingSpaces) {
        if (index === 0) {
          removedBeforeSelection = Math.min(leadingSpaces[0].length, selectionStart - lineStart);
        }
        return line.slice(leadingSpaces[0].length);
      }
      return line;
    });
    const nextBlock = nextLines.join("\n");
    outputText2.setRangeText(nextBlock, lineStart, actualLineEnd, "preserve");
    if (selectionStart === selectionEnd) {
      const nextCursor = direction > 0 ? selectionStart + indent.length : Math.max(lineStart, selectionStart - removedBeforeSelection);
      outputText2.setSelectionRange(nextCursor, nextCursor);
      return;
    }
    const delta = nextBlock.length - selectedBlock.length;
    const nextStart = direction > 0 ? selectionStart + indent.length : Math.max(lineStart, selectionStart - removedBeforeSelection);
    outputText2.setSelectionRange(nextStart, selectionEnd + delta);
  }
  function syncCodeEditorAfterProgrammaticEdit() {
    syncEditorToInputHTML();
    updateLiveView();
    refreshReviewPanel();
    updateCodeHighlight();
  }
  function getShortcutDigit(event) {
    if (/^[0-6]$/.test(event.key)) {
      return event.key;
    }
    const match = /^Digit([0-6])$/.exec(event.code || "");
    return match ? match[1] : null;
  }
  function isShortcutDigit(event, digit) {
    return event.key === digit || event.code === `Digit${digit}`;
  }
  function getSelectedListItem(root, selection = getEditorSelection(root)) {
    if (!root || !selection || selection.rangeCount === 0) {
      return null;
    }
    return getClosestElement(selection.anchorNode, root, "li");
  }
  function getEditorSelection(root) {
    if (!root) {
      return null;
    }
    const rootNode = root.getRootNode ? root.getRootNode() : document;
    if (rootNode && typeof rootNode.getSelection === "function") {
      const selection = rootNode.getSelection();
      if (selection && selection.rangeCount > 0) {
        return selection;
      }
    }
    return window.getSelection ? window.getSelection() : null;
  }
  function getClosestElement(node, root, selector) {
    let element = node && node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (element && element !== root) {
      if (element.matches(selector)) {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }
  function replaceElementTag(root, sourceTag, targetTag) {
    if (!root) {
      return;
    }
    Array.from(root.querySelectorAll(sourceTag)).forEach((sourceElement) => {
      const targetElement = document.createElement(targetTag);
      Array.from(sourceElement.attributes).forEach((attribute) => {
        targetElement.setAttribute(attribute.name, attribute.value);
      });
      while (sourceElement.firstChild) {
        targetElement.appendChild(sourceElement.firstChild);
      }
      sourceElement.replaceWith(targetElement);
    });
  }
  function removeEmptyStyleAttributes(root) {
    if (!root) {
      return;
    }
    Array.from(root.querySelectorAll("[style]")).forEach((element) => {
      if (!element.getAttribute("style").trim()) {
        element.removeAttribute("style");
      }
    });
  }
  function getTextSelectionRange(root) {
    const selection = getEditorSelection(root);
    if (!root || !selection || selection.rangeCount === 0) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
      return null;
    }
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(root);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(root);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    return {
      start: beforeStart.toString().length,
      end: beforeEnd.toString().length
    };
  }
  function rememberLiveSelection() {
    const selectionRange = getTextSelectionRange(liveEditor);
    if (selectionRange) {
      lastLiveSelectionRange = selectionRange;
    }
  }
  function restoreTextSelectionRange(root, savedRange) {
    if (!root || !savedRange) {
      return;
    }
    const selection = getEditorSelection(root);
    if (!selection) {
      return;
    }
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startSet = false;
    let endSet = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nextOffset = currentOffset + node.nodeValue.length;
      if (!startSet && savedRange.start >= currentOffset && savedRange.start <= nextOffset) {
        range.setStart(node, savedRange.start - currentOffset);
        startSet = true;
      }
      if (!endSet && savedRange.end >= currentOffset && savedRange.end <= nextOffset) {
        range.setEnd(node, savedRange.end - currentOffset);
        endSet = true;
        break;
      }
      currentOffset = nextOffset;
    }
    if (!startSet) {
      range.setStart(root, 0);
    }
    if (!endSet) {
      range.setEnd(root, root.childNodes.length);
    }
    root.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function handleFileInputChange(event) {
    const selectedFile = event && event.target && event.target.files ? event.target.files[0] : null;
    processSelectedFile(selectedFile);
  }
  function handleFileDrop(event) {
    const droppedFiles = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files : [];
    if (!droppedFiles.length) {
      addProcessingLog("No file detected in drop.", "warning");
      return;
    }
    const droppedFile = droppedFiles[0];
    try {
      const transfer = new DataTransfer();
      transfer.items.add(droppedFile);
      file.files = transfer.files;
    } catch (error) {
      console.warn("Could not sync dropped file to file input:", error);
    }
    processSelectedFile(droppedFile);
  }
  function processSelectedFile(selectedFile) {
    if (!selectedFile) {
      updateFileDropZoneState(false);
      addProcessingLog("No file selected.", "warning");
      return;
    }
    closeOpenUIForFileUpload();
    const validExtension = /\.docx?$/i.test(selectedFile.name);
    if (!validExtension) {
      updateFileDropZoneState(false);
      addProcessingLog("Unsupported file type. Please use a .docx file.", "danger");
      return;
    }
    if (!getMammothLibrary()) {
      addProcessingLog("Mammoth is not loaded. Check that src/mammoth.browser.js is loading before propel.js.", "danger");
      return;
    }
    getStartTime();
    updateFileDropZoneState(true);
    addProcessingLog(`Started conversion: ${selectedFile.name}`, "info");
    convertUsingMammoth(selectedFile);
  }
  function closeOpenUIForFileUpload() {
    drawers.activity.setOpen(false);
    drawers.shortcuts.close();
    closeAddIDsSettings();
    closeComponentLibrary();
    tableEditor.close();
    tableEditor.hideLiveTablePopover();
  }
  function updateFileDropZoneState(hasFile) {
    if (fileDropZone) {
      fileDropZone.classList.toggle("has-file", hasFile);
    }
    onboarding.update(hasFile);
  }
  function handleToggleOnThisPageBox() {
    addProcessingLog(`${onThisPageBox.checked ? "Enabled" : "Disabled"} On this page generation.`, "info");
    updateAddIDsSettingsState();
  }
  function toggleAddIDsSettings() {
    if (!otpSettings) {
      return;
    }
    const isOpen = !otpSettings.classList.contains("open");
    if (isOpen) {
      document.body.appendChild(otpSettings);
      otpSettings.classList.add("open");
    } else {
      closeAddIDsSettings();
      return;
    }
    setAddIDsPopoverExpanded(isOpen);
    if (addIDsSettingsBackdrop) {
      addIDsSettingsBackdrop.classList.toggle("open", isOpen);
    }
    if (isOpen) {
      positionAddIDsSettings();
    }
  }
  function positionAddIDsSettings() {
    if (!otpSettings || !otpSettings.classList.contains("open")) {
      return;
    }
    const trigger = addIDsSettingsBtn || addIDsBtn;
    if (!trigger) {
      return;
    }
    const gap = 8;
    const viewportPadding = 16;
    const triggerRect = trigger.getBoundingClientRect();
    const dialogRect = otpSettings.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - dialogRect.width - viewportPadding);
    const left = Math.min(Math.max(triggerRect.right - dialogRect.width, viewportPadding), maxLeft);
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const top = spaceBelow >= dialogRect.height ? triggerRect.bottom + gap : Math.max(viewportPadding, triggerRect.top - dialogRect.height - gap);
    otpSettings.style.left = `${left}px`;
    otpSettings.style.top = `${top}px`;
  }
  function closeAddIDsSettings() {
    if (!otpSettings) {
      return;
    }
    otpSettings.classList.remove("open");
    setAddIDsPopoverExpanded(false);
    if (addIDsSettingsBackdrop) {
      addIDsSettingsBackdrop.classList.remove("open");
    }
    if (addIDsSettingsParent && otpSettings.parentNode !== addIDsSettingsParent) {
      addIDsSettingsParent.insertBefore(otpSettings, addIDsSettingsNextSibling);
    }
  }
  function setAddIDsPopoverExpanded(isOpen) {
    [addIDsBtn, addIDsSettingsBtn].forEach((trigger) => {
      if (trigger) {
        trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    });
  }
  function handleGlobalKeydown(event) {
    if (tableEditor.isOpen() && isDocumentHistoryShortcut(event)) {
      tableEditor.handleHistoryShortcut(event);
      return;
    }
    if (isDocumentHistoryShortcut(event) && !isNativeHistoryField(event.target)) {
      handleDocumentHistoryShortcut(event);
      return;
    }
    if (event.key === "Escape") {
      if (componentLibraryModal == null ? void 0 : componentLibraryModal.classList.contains("open")) {
        closeComponentLibrary();
        return;
      }
      drawers.shortcuts.close();
      tableEditor.handleEscape();
    }
  }
  function isDocumentHistoryShortcut(event) {
    const key = (event.key || "").toLowerCase();
    return Boolean(
      (event.ctrlKey || event.metaKey) && !event.altKey && (key === "z" || key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey)
    );
  }
  function isNativeHistoryField(target) {
    if (!target || !target.closest) {
      return false;
    }
    return Boolean(target.closest('input:not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"]'));
  }
  function getFocusableElements2(root) {
    return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
  }
  function updateAddIDsSettingsState() {
    if (!addIDsSettingsBtn) {
      return;
    }
    const hasCustomSettings = Boolean(
      onThisPageBox && onThisPageBox.checked || headerDepth && headerDepth.value !== "2" || isToC && isToC.checked
    );
    addIDsSettingsBtn.classList.toggle("modified", hasCustomSettings);
    addIDsSettingsBtn.setAttribute("aria-label", hasCustomSettings ? "Add IDs options, modified" : "Add IDs options");
  }
  async function convertUsingMammoth(file2) {
    const mammothLibrary = getMammothLibrary();
    if (!mammothLibrary) {
      addProcessingLog("Mammoth is not loaded.", "danger");
      return;
    }
    setDocumentLoading(true);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file2);
      clearOutputText();
      applyDetectedDocumentLanguage(await detectDocxLanguageFromMetadata(arrayBuffer, file2.name, mammothLibrary));
      const { html, messages } = await convertWithMammoth(mammothLibrary, arrayBuffer);
      handleConvertedHTML(html);
      if (messages.length > 0) {
        addProcessingLog(`Mammoth returned ${messages.length} message(s). Check console for details.`, "warning");
        console.warn(messages);
      }
    } catch (error) {
      console.error("Mammoth conversion error:", error);
      addProcessingLog("Mammoth conversion error. Check console for details.", "danger");
    } finally {
      setDocumentLoading(false);
    }
  }
  function setDocumentLoading(isLoading) {
    if (documentLoader) {
      documentLoader.classList.toggle("hidden", !isLoading);
      documentLoader.setAttribute("aria-hidden", String(!isLoading));
    }
    if (editorDropZone) {
      editorDropZone.setAttribute("aria-busy", String(isLoading));
    }
  }
  function detectDocxLanguageFromMetadata(arrayBuffer, fileName, mammothLibrary) {
    if (!/\.docx$/i.test(fileName) || !mammothLibrary || typeof mammothLibrary._openZip !== "function") {
      return Promise.resolve(null);
    }
    return mammothLibrary._openZip({ arrayBuffer }).then(function(docxFile) {
      const languageFiles = [
        "word/document.xml",
        "word/styles.xml",
        "word/settings.xml"
      ];
      return Promise.all(languageFiles.map(function(path) {
        if (!docxFile.exists(path)) {
          return "";
        }
        return docxFile.read(path, "utf-8");
      }));
    }).then(function(xmlParts) {
      return getLanguageResultFromDocxXml({
        documentXml: xmlParts[0],
        stylesXml: xmlParts[1],
        settingsXml: xmlParts[2]
      });
    }).catch(function(error) {
      console.warn("Could not read DOCX language metadata:", error);
      addProcessingLog("Could not read DOCX language metadata.", "warning");
      return null;
    });
  }
  function applyDetectedDocumentLanguage(languageResult) {
    if (!languageResult) {
      addProcessingLog("No English or French DOCX language metadata found.", "info");
      return;
    }
    const changed = setCommandLanguage(languageResult.language);
    const languageName = languageResult.language === "en" ? "English" : "French";
    const defaultSummary = languageResult.defaultLanguage ? `default ${languageResult.defaultLanguage.toUpperCase()}, ` : "";
    const summary = `${defaultSummary}explicit text EN ${languageResult.counts.en}, FR ${languageResult.counts.fr}`;
    addProcessingLog(`DOCX language metadata indicates ${languageName} (${summary}).${changed ? " Updated command language." : ""}`, "info");
  }
  function handleConvertedHTML(html) {
    documentStore.replaceHTML(html, { source: "conversion" });
    const { imageSources: imgCount, bookmarks: bookmarkCount, bookmarkLinks: hrefCount } = runStandardCleanup(inputHTML2);
    const conversionTime = getEndTime();
    updateOutputText();
    scrollSmoothTo(outputSection);
    addProcessingLog(`Converted document in ${conversionTime} seconds.`, "success");
    addProcessingLog(`Initial cleanup: cleared ${imgCount} image src value(s), removed ${bookmarkCount} Word bookmark anchor(s), cleaned ${hrefCount} Word bookmark href(s).`, "info");
  }
  function standardCleanupCommand() {
    try {
      syncActiveEditorToInputHTML();
      if (!hasInput()) {
        throw new Error("Input is empty");
      }
      const { imageSources: imgCount, bookmarks: bookmarkCount, bookmarkLinks: hrefCount } = runStandardCleanup(inputHTML2);
      updateOutputText();
      addProcessingLog(`Standard cleanup successful: cleared ${imgCount} image src value(s), removed ${bookmarkCount} Word bookmark anchor(s), cleaned ${hrefCount} Word bookmark href(s), and normalized smart quotes.`, "success");
    } catch (e) {
      addProcessingLog("Error for Standard cleanup. Input is empty or invalid.", "danger");
      console.error(e);
    }
  }
  function addIDsCommand() {
    modifiedComponents = [];
    headingIDCount = 0;
    tableIDCount = 0;
    figureIDCount = 0;
    try {
      syncActiveEditorToInputHTML();
      modifyHeadings(inputHTML2, headingIDCount, modifiedComponents);
      modifyTables(inputHTML2, tableIDCount, modifiedComponents);
      modifyFigures(inputHTML2, figureIDCount, modifiedComponents);
      if (onThisPageBox.checked) {
        createOnThisPage(inputHTML2, isEngLang);
      }
      updateOutputText();
      addProcessingLog(`Add IDs successful${onThisPageBox.checked ? " with On this page generated" : ""}.`, "success");
    } catch (e) {
      addProcessingLog("Error for Add IDs. Check console for details.", "danger");
      console.error(e);
    }
  }
  function generateFootnotesCommand() {
    try {
      syncActiveEditorToInputHTML();
      createBodyFtnTags(inputHTML2, langStrings);
      replaceFootnoteSection(inputHTML2, langStrings, isEngLang);
      updateOutputText();
      addProcessingLog("Generate Footnotes successful.", "success");
    } catch (e) {
      addProcessingLog("Error for Generate Footnotes. Check console for details.", "danger");
      console.error(e);
    }
  }
  function validateNbspCommand() {
    try {
      syncActiveEditorToInputHTML();
      documentStore.replaceHTML(fixNbspHTML(inputHTML2.innerHTML, !isEngLang), { source: "document.fixSpacing" });
      updateOutputText();
      addProcessingLog("Validate &nbsp; successful.", "success");
    } catch (e) {
      addProcessingLog("Error for Validate &nbsp;. Check console for details.", "danger");
      console.error(e);
    }
  }
  function convertToComponentCommand() {
    const component = getSelectedComponent();
    try {
      if (!component || !(pendingComponentSelection == null ? void 0 : pendingComponentSelection.html)) {
        throw new Error("Select text or HTML before converting it to a component.");
      }
      commitDocumentHistory("typing");
      activeDocumentCommandLabel = `Convert to ${component.name}`;
      if (pendingComponentSelection.view === "table") {
        pendingComponentSelection.apply(applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? "en" : "fr" }));
      } else if (pendingComponentSelection.view === "code") {
        const result = convertSelectionToComponent({
          html: outputText2.value,
          selectionStart: pendingComponentSelection.start,
          selectionEnd: pendingComponentSelection.end,
          component,
          language: isEngLang ? "en" : "fr"
        });
        outputText2.value = result.html;
        syncEditorToInputHTML();
      } else {
        const range = pendingComponentSelection.range;
        if (!range || range.collapsed || !liveEditor.contains(range.commonAncestorContainer)) {
          throw new Error("The Live view selection is no longer available. Select it again.");
        }
        const converted = applySmartComponent(component, pendingComponentSelection.html, { language: isEngLang ? "en" : "fr" });
        const fragment = range.createContextualFragment(converted);
        range.deleteContents();
        range.insertNode(fragment);
        syncLiveToInputHTML();
      }
      updateOutputText();
      addProcessingLog(`Converted selection to ${component.name}.`, "success");
      closeComponentLibrary();
      pendingComponentSelection = null;
    } catch (error) {
      activeDocumentCommandLabel = null;
      addProcessingLog(`Could not convert selection: ${error.message}`, "danger");
      console.error(error);
    }
  }
  function tableCleanupCommand() {
    try {
      syncActiveEditorToInputHTML();
      if (!hasInput()) {
        throw new Error("Input is empty");
      }
      const tableCount = inputHTML2.querySelectorAll("table").length;
      if (tableCount === 0) {
        addProcessingLog("No tables found for Table Cleanup.", "warning");
        return;
      }
      addProcessingLog(`Table cleanup opened. Previewing ${tableCount} table(s); changes apply only after pressing Apply.`, "info");
      tableEditor.open(0);
    } catch (e) {
      addProcessingLog("Error for Table Cleanup. Input is empty or invalid.", "danger");
      console.error(e);
    }
  }
  function qaHelperCount() {
    try {
      syncActiveEditorToInputHTML();
      countTags(inputHTML2);
      refreshReviewPanel();
      addProcessingLog("QA Helper count completed.", "success");
    } catch (e) {
      addProcessingLog("Error for QA Helper Count. Check console for details.", "danger");
      console.error(e);
    }
  }
  function getStartTime() {
    startTime = performance.now();
  }
  function getEndTime() {
    endTime = performance.now();
    var timeDiff = endTime - startTime;
    timeDiff /= 1e3;
    return timeDiff.toFixed(4);
  }
  function updateOutputText() {
    if (!inputHTML2.classList.contains("content-area")) {
      inputHTML2.classList.add("content-area");
    }
    const commandLabel = activeDocumentCommandLabel;
    commitDocumentHistory("command", commandLabel);
    activeDocumentCommandLabel = null;
    updateCodeView();
    updateLiveView();
    refreshReviewPanel();
  }
  function updateInputHTML() {
    syncEditorToInputHTML();
    updateOutputText();
  }
  function syncActiveEditorToInputHTML() {
    if (activeEditorView === "live") {
      syncLiveToInputHTML();
      return;
    }
    syncEditorToInputHTML();
  }
  function getHTMLForCopy() {
    if (activeEditorView === "live") {
      syncLiveToInputHTML();
      updateCodeView();
    } else {
      syncEditorToInputHTML();
    }
    return outputText2.value;
  }
  function syncEditorToInputHTML() {
    cancelPendingTypingRefresh();
    Array.from(inputHTML2.attributes).forEach((attribute) => inputHTML2.removeAttribute(attribute.name));
    inputHTML2.innerHTML = outputText2.value;
    adoptSingleOuterDiv();
    inputHTML2.querySelectorAll(".content-area").forEach((element) => {
      element.classList.remove("content-area");
      if (element.classList.length === 0) {
        element.removeAttribute("class");
      }
    });
    inputHTML2.classList.add("content-area");
  }
  function adoptSingleOuterDiv() {
    const outerDiv = inputHTML2.children.length === 1 && inputHTML2.firstElementChild.tagName === "DIV" && Array.from(inputHTML2.childNodes).every(
      (node) => node === inputHTML2.firstElementChild || node.nodeType === Node.TEXT_NODE && node.textContent.trim() === ""
    ) ? inputHTML2.firstElementChild : null;
    if (!outerDiv) {
      return;
    }
    const attributes = Array.from(outerDiv.attributes, (attribute) => [attribute.name, attribute.value]);
    inputHTML2.replaceChildren(...outerDiv.childNodes);
    Array.from(inputHTML2.attributes).forEach((attribute) => inputHTML2.removeAttribute(attribute.name));
    attributes.forEach(([name, value]) => inputHTML2.setAttribute(name, value));
  }
  function syncLiveToInputHTML() {
    if (!liveEditor) {
      return;
    }
    cancelPendingTypingRefresh();
    const clone = liveEditor.cloneNode(true);
    clone.querySelectorAll(".review-flag-button").forEach((element) => element.remove());
    clone.querySelectorAll(".review-flagged-component, .review-flag-target").forEach((element) => {
      element.classList.remove("review-flagged-component", "review-flag-error", "review-flag-target");
      element.removeAttribute("data-review-issues");
      if (!element.className) element.removeAttribute("class");
    });
    replaceElementTag(clone, "b", "strong");
    replaceElementTag(clone, "i", "em");
    removeEmptyStyleAttributes(clone);
    inputHTML2.innerHTML = clone.innerHTML;
    inputHTML2.classList.add("content-area");
  }
  function updateCodeView() {
    if (!outputText2) {
      return;
    }
    if (!inputHTML2.classList.contains("content-area")) {
      inputHTML2.classList.add("content-area");
    }
    outputText2.value = hasInput() ? formattedHTML(inputHTML2) : "";
    updateFileDropZoneState(hasInput());
    updateElementSyncLineMap();
    updateCodeHighlight();
  }
  function updateLiveView() {
    if (!liveEditor) {
      return;
    }
    const clone = inputHTML2.cloneNode(true);
    clone.querySelectorAll("script, style, link").forEach((element) => element.remove());
    liveEditor.innerHTML = hasInput() ? clone.innerHTML : "";
    updateFileDropZoneState(hasInput());
  }
  function scrollCodeToLiveElement(target) {
    if (!liveEditor || !outputText2 || !target || !liveEditor.contains(target)) {
      return;
    }
    const liveElement = getLiveSyncElement(target);
    if (!liveElement) {
      return;
    }
    const path = getElementPath(liveElement, liveEditor);
    if (!path) {
      return;
    }
    syncLiveToInputHTML();
    updateCodeView();
    const codeEntry = getCodeEntryForPath(path);
    if (!codeEntry) {
      return;
    }
    scrollCodeToIndex(codeEntry.startIndex);
    updateCodeReciprocalCaret();
  }
  function getLiveSyncElement(target) {
    const element = target.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!element || element === liveEditor) {
      return null;
    }
    return element;
  }
  function scrollLiveToCodeClick(event) {
    if (!liveEditor || !outputText2 || elementSyncLineMap.length === 0) {
      return;
    }
    const match = getSyncEntryForCodeIndex(outputText2.selectionStart || 0);
    if (!match) {
      return;
    }
    const liveElement = getElementByPath(liveEditor, match.path);
    if (!liveElement) {
      return;
    }
    scrollLiveElementIntoView(liveElement);
  }
  function updateCodeReciprocalCaret() {
    if (activeEditorView !== "live" || pendingTypingView === "live" || !codeReciprocalCaret || !outputText2) {
      hideReciprocalCaret(codeReciprocalCaret);
      return;
    }
    const selection = getEditorSelection(liveEditor);
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
      hideReciprocalCaret(codeReciprocalCaret);
      return;
    }
    const range = selection.getRangeAt(0);
    const sourceIndex = getSourceIndexForLiveCaret({
      html: outputText2.value,
      root: liveEditor,
      node: range.startContainer,
      offset: range.startOffset,
      entries: elementSyncLineMap,
      decodeEntity: decodeHTMLEntity
    });
    const coordinates = sourceIndex === null ? null : getCodeCoordinatesForIndex(sourceIndex);
    if (!coordinates || coordinates.top < 0 || coordinates.top > outputText2.clientHeight - 2) {
      hideReciprocalCaret(codeReciprocalCaret);
      return;
    }
    codeReciprocalCaret.style.left = `${coordinates.left}px`;
    codeReciprocalCaret.style.top = `${coordinates.top}px`;
    codeReciprocalCaret.classList.add("visible");
  }
  function updateLiveReciprocalCaret() {
    if (activeEditorView !== "code" || pendingTypingView === "code" || !liveReciprocalCaret || !outputText2 || outputText2.selectionStart !== outputText2.selectionEnd) {
      hideReciprocalCaret(liveReciprocalCaret);
      return;
    }
    const sourceIndex = outputText2.selectionStart || 0;
    updateElementSyncLineMap();
    const entry = getSyncEntryForCodeIndex(sourceIndex);
    const point = getLiveCaretForSourceIndex({
      html: outputText2.value,
      root: liveEditor,
      sourceIndex,
      entry,
      decodeEntity: decodeHTMLEntity
    });
    if (!point) {
      hideReciprocalCaret(liveReciprocalCaret);
      return;
    }
    const range = document.createRange();
    range.setStart(point.node, point.offset);
    range.collapse(true);
    const rect = range.getClientRects()[0] || getFallbackCaretRect(point.node);
    const hostRect = liveEditorHost.getBoundingClientRect();
    if (!rect || rect.bottom < hostRect.top || rect.top > hostRect.bottom) {
      hideReciprocalCaret(liveReciprocalCaret);
      return;
    }
    liveReciprocalCaret.style.left = `${rect.left - hostRect.left}px`;
    liveReciprocalCaret.style.top = `${rect.top - hostRect.top}px`;
    liveReciprocalCaret.style.height = `${Math.max(16, rect.height)}px`;
    liveReciprocalCaret.classList.add("visible");
  }
  function hideReciprocalCaret(caret) {
    caret == null ? void 0 : caret.classList.remove("visible");
  }
  function decodeHTMLEntity(source) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = source;
    return decoder.value;
  }
  function getFallbackCaretRect(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return (element == null ? void 0 : element.getBoundingClientRect()) || null;
  }
  function getCodeCoordinatesForIndex(codeIndex) {
    const style = window.getComputedStyle(outputText2);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    [
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "tabSize",
      "textAlign",
      "textIndent",
      "textTransform",
      "whiteSpace",
      "wordBreak"
    ].forEach((property) => {
      mirror.style[property] = style[property];
    });
    mirror.style.overflowWrap = style.overflowWrap;
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.width = `${outputText2.clientWidth}px`;
    mirror.style.height = "auto";
    mirror.style.overflow = "hidden";
    marker.textContent = "\u200B";
    mirror.append(document.createTextNode(outputText2.value.slice(0, codeIndex)), marker);
    document.body.appendChild(mirror);
    const coordinates = {
      left: marker.offsetLeft - outputText2.scrollLeft,
      top: marker.offsetTop - outputText2.scrollTop
    };
    mirror.remove();
    return coordinates;
  }
  function getCodeEntryForPath(path) {
    const pathKey = path.join(".");
    return elementSyncLineMap.find((entry) => entry.pathKey === pathKey) || null;
  }
  function scrollEditorsToElementPath(path) {
    if (!path || !Array.isArray(path)) {
      return;
    }
    const liveElement = liveEditor ? getElementByPath(liveEditor, path) : null;
    if (liveElement) {
      scrollLiveElementIntoView(liveElement);
    }
    if (outputText2) {
      if (elementSyncLineMap.length === 0) {
        updateElementSyncLineMap();
      }
      const codeEntry = getCodeEntryForPath(path);
      if (codeEntry) {
        scrollCodeToIndex(codeEntry.startIndex);
      }
    }
  }
  function getSyncEntryForCodeIndex(codeIndex) {
    const containingEntries = elementSyncLineMap.filter((entry) => entry.startIndex <= codeIndex && codeIndex <= entry.endIndex).sort((first, second) => {
      if (second.path.length !== first.path.length) {
        return second.path.length - first.path.length;
      }
      return first.endIndex - first.startIndex - (second.endIndex - second.startIndex);
    });
    if (containingEntries.length > 0) {
      return containingEntries[0];
    }
    let previous = null;
    for (const entry of elementSyncLineMap) {
      if (entry.startIndex > codeIndex) {
        break;
      }
      previous = entry;
    }
    return previous || elementSyncLineMap[0] || null;
  }
  function updateElementSyncLineMap() {
    elementSyncLineMap = [];
    if (!outputText2 || !outputText2.value.trim()) {
      return;
    }
    elementSyncLineMap = buildElementSourceMap(outputText2.value);
  }
  function scrollCodeToIndex(codeIndex) {
    outputText2.scrollTop = getCodeScrollTopForIndex(codeIndex);
    syncCodeHighlightScroll();
  }
  function getCodeScrollTopForIndex(codeIndex) {
    const style = window.getComputedStyle(outputText2);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    const mirroredProperties = [
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "paddingBottom",
      "paddingLeft",
      "paddingRight",
      "paddingTop",
      "tabSize",
      "textAlign",
      "textIndent",
      "textTransform",
      "whiteSpace",
      "wordBreak"
    ];
    mirroredProperties.forEach((property) => {
      mirror.style[property] = style[property];
    });
    mirror.style.overflowWrap = style.overflowWrap;
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "-9999px";
    mirror.style.top = "0";
    mirror.style.width = `${outputText2.clientWidth}px`;
    mirror.style.minHeight = "0";
    mirror.style.height = "auto";
    mirror.style.overflow = "hidden";
    marker.textContent = "\u200B";
    marker.style.display = "inline-block";
    mirror.appendChild(document.createTextNode(outputText2.value.slice(0, codeIndex)));
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const targetTop = Math.max(0, marker.offsetTop - outputText2.clientHeight * 0.28);
    mirror.remove();
    return targetTop;
  }
  function scrollLiveElementIntoView(element) {
    const editorRect = liveEditor.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = Math.max(0, liveEditor.scrollTop + (elementRect.top - editorRect.top) - liveEditor.clientHeight * 0.16);
    liveEditor.scrollTop = targetTop;
  }
  function updateCodeHighlight() {
    if (!codeHighlight || !outputText2) {
      return;
    }
    const code = codeHighlight.querySelector("code") || codeHighlight;
    code.innerHTML = highlightHTML(outputText2.value);
    codeEditor == null ? void 0 : codeEditor.classList.remove("is-typing");
    syncCodeHighlightScroll();
  }
  function syncCodeHighlightScroll() {
    if (!codeHighlight || !outputText2) {
      return;
    }
    codeHighlight.scrollTop = outputText2.scrollTop;
    codeHighlight.scrollLeft = outputText2.scrollLeft;
  }
  function highlightHTML(html) {
    const escaped = escapeHTML(html);
    return escaped.replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([A-Za-z][\w:-]*)([\s\S]*?)(\/?&gt;)/g, (match, comment, bracket, tagName, attributes, closeBracket) => {
      if (comment) {
        return `<span class="syntax-comment">${comment}</span>`;
      }
      const highlightedAttributes = attributes.replace(/([^\s=\/&]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;|[^\s&]+)?/g, (attributeMatch, name, equals, value = "") => {
        return `<span class="syntax-attr">${name}</span>${equals}<span class="syntax-value">${value}</span>`;
      });
      return `<span class="syntax-bracket">${bracket}</span><span class="syntax-name">${tagName}</span><span class="syntax-tag">${highlightedAttributes}${closeBracket}</span>`;
    });
  }
  function clearOutputText() {
    outputText2.value = " ";
    updateCodeHighlight();
    if (liveEditor) {
      liveEditor.innerHTML = "";
    }
    refreshReviewPanel();
  }
  function refreshReviewPanel() {
    updateDocumentHealth();
    updateHeadingOutline();
    updateIssues();
    updateHtmlPreview();
    updateLiveReviewFlags();
  }
  function updateDocumentHealth() {
    var _a2;
    if (!documentHealth || !healthScore) {
      return;
    }
    const stats = getDocumentStats();
    if (!hasInput()) {
      healthScore.className = "label label-default";
      healthScore.textContent = "Not checked";
      documentHealth.innerHTML = '<p class="text-muted">Document report will appear here after conversion or editing.</p>';
      return;
    }
    const issueGroups = getDocumentIssueGroups();
    const issueTotal = issueGroups.reduce((total, group) => total + group.targets.length, 0);
    const errorTotal = issueGroups.filter((group) => group.severity === "error").reduce((total, group) => total + group.targets.length, 0);
    let statusText = "Looks clean";
    let statusClass = "label-success";
    if (issueTotal === 0) {
      statusText = "Looks clean";
      statusClass = "label-success";
    } else if (errorTotal === 0) {
      statusText = "Review suggested";
      statusClass = "label-warning";
    } else {
      statusText = "Needs review";
      statusClass = "label-danger";
    }
    healthScore.className = `label ${statusClass}`;
    healthScore.textContent = statusText;
    documentHealth.innerHTML = `
        <div class="report-summary">
            <button type="button" class="label ${statusClass} report-review-score" aria-controls="issuesPane">${statusText}</button>
            <span class="text-muted">${issueTotal} review item${issueTotal === 1 ? "" : "s"}</span>
        </div>
        <div class="report-stats" role="group" aria-label="Choose outline contents">
            ${Object.entries(outlineTypes).map(([type, config]) => `
                <button type="button" class="report-stat${selectedOutlineType === type ? " is-selected" : ""}"
                    data-outline-type="${type}" aria-pressed="${selectedOutlineType === type}">
                    <span class="report-stat-label">${config.label}</span>
                    <span class="report-stat-count">${type === "footnotes" ? stats.footnoteRefs : stats[type]}</span>
                </button>`).join("")}
        </div>`;
    (_a2 = documentHealth.querySelector(".report-review-score")) == null ? void 0 : _a2.addEventListener("click", openActivityReviewTab);
    documentHealth.querySelectorAll("[data-outline-type]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedOutlineType = button.dataset.outlineType;
        updateDocumentHealth();
        updateHeadingOutline();
      });
    });
  }
  function updateHeadingOutline() {
    if (!documentOutline) {
      return;
    }
    const outlineType = outlineTypes[selectedOutlineType] || outlineTypes.headings;
    const elements = Array.from(inputHTML2.querySelectorAll(outlineType.selector));
    const outlineHeading = `<strong class="report-heading">${outlineType.label}</strong>`;
    if (elements.length === 0) {
      documentOutline.innerHTML = `${outlineHeading}<p class="text-muted">${outlineType.empty}</p>`;
      return;
    }
    const outline = document.createElement("ol");
    outline.className = "report-outline";
    elements.forEach((element) => {
      const isHeading = /^H[1-6]$/.test(element.tagName);
      const level = isHeading ? Number(element.tagName.substring(1)) : 1;
      const path = getElementPath(element, inputHTML2);
      const item = document.createElement("li");
      const button = document.createElement("button");
      const label = document.createElement("span");
      item.style.marginLeft = `${Math.max(0, level - 1) * 12}px`;
      button.type = "button";
      button.className = "report-outline-button";
      button.innerHTML = `<span class="label label-default">${element.tagName.toLowerCase()}</span>`;
      label.textContent = getOutlineElementLabel(element, selectedOutlineType);
      button.append(" ", label);
      button.addEventListener("click", () => {
        scrollEditorsToElementPath(path);
      });
      item.appendChild(button);
      outline.appendChild(item);
    });
    documentOutline.innerHTML = "";
    const heading = document.createElement("strong");
    heading.textContent = outlineType.label;
    heading.className = "report-heading";
    documentOutline.appendChild(heading);
    documentOutline.appendChild(outline);
  }
  function getOutlineElementLabel(element, type) {
    if (type === "images") {
      return element.getAttribute("alt") || element.getAttribute("src") || "(unlabelled image)";
    }
    if (type === "links" || type === "footnotes") {
      return element.textContent.trim() || element.getAttribute("href") || "(empty link)";
    }
    const text = element.textContent.replace(/\s+/g, " ").trim();
    return text || `(empty ${type.slice(0, -1)})`;
  }
  function updateIssues() {
    if (!documentIssues) {
      return;
    }
    const issueGroups = getDocumentIssueGroups();
    if (!hasInput()) {
      documentIssues.innerHTML = '<p class="text-muted">Items to review will appear here.</p>';
      return;
    }
    if (issueGroups.length === 0) {
      documentIssues.innerHTML = '<p class="text-success">No obvious structural issues found.</p>';
      return;
    }
    const warningCount = issueGroups.filter((group) => group.severity === "warning").reduce((total, group) => total + group.targets.length, 0);
    const errorCount = issueGroups.filter((group) => group.severity === "error").reduce((total, group) => total + group.targets.length, 0);
    const summary = document.createElement("dl");
    summary.className = "review-issue-summary";
    [
      ["Warnings", warningCount, "warning"],
      ["Errors", errorCount, "error"],
      ["Total", warningCount + errorCount, "total"]
    ].forEach(([label, count, type]) => {
      const stat = document.createElement("div");
      const term = document.createElement("dt");
      const value = document.createElement("dd");
      stat.className = `review-issue-summary-${type}`;
      term.textContent = label;
      value.textContent = String(count);
      stat.append(term, value);
      summary.appendChild(stat);
    });
    const groupsContainer = document.createDocumentFragment();
    issueGroups.forEach((group) => {
      const section = document.createElement("section");
      const header = document.createElement("div");
      const heading = document.createElement("h4");
      const count = document.createElement("span");
      const list = document.createElement("ul");
      const paths = group.targets.map((target) => getElementPath(target, inputHTML2));
      section.className = "review-issue-group";
      header.className = "review-issue-group-header";
      heading.textContent = group.label;
      count.className = "review-issue-group-count";
      count.textContent = String(group.targets.length);
      header.append(heading, count);
      if (group.action && group.actionLabel) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "btn btn-xs review-issue-action";
        action.textContent = group.actionLabel;
        action.addEventListener("click", () => runReviewIssueAction(group.action, paths));
        header.appendChild(action);
      }
      section.append(header, list);
      group.targets.forEach((target, index) => {
        const item = document.createElement("li");
        const row = document.createElement("button");
        const pill = document.createElement("span");
        const text = document.createElement("span");
        const path = getElementPath(target, inputHTML2);
        const issueKey = getReviewIssueKey(group.label, path);
        row.type = "button";
        row.className = "report-issue-row";
        row.dataset.reviewIssue = issueKey;
        row.addEventListener("click", () => goToReviewError(path));
        pill.className = `report-issue-pill report-issue-pill-${group.severity}`;
        pill.textContent = group.severity === "warning" ? "Warning" : "Error";
        text.textContent = group.getMessage(target, index);
        row.append(pill, text);
        item.appendChild(row);
        list.appendChild(item);
      });
      groupsContainer.appendChild(section);
    });
    documentIssues.replaceChildren(summary, groupsContainer);
  }
  function getDocumentIssueGroups() {
    return analyzeDocument(inputHTML2).issueGroups;
  }
  function runReviewIssueAction(action, paths) {
    const firstPath = paths.find((path) => Array.isArray(path));
    if (action === "addIds") {
      commandRegistry.execute("document.addIds");
      return;
    }
    if (action === "tableCleanup" && firstPath) {
      syncActiveEditorToInputHTML();
      const table = getElementByPath(inputHTML2, firstPath);
      const tableIndex = Array.from(inputHTML2.querySelectorAll("table")).indexOf(table);
      if (tableIndex >= 0) {
        drawers.activity.setOpen(false);
        tableEditor.open(tableIndex);
        addProcessingLog(`Table cleanup opened from Review for table ${tableIndex + 1}.`, "info");
      }
      return;
    }
  }
  function updateLiveReviewFlags() {
    if (!liveEditor) return;
    liveEditor.querySelectorAll(".review-flag-button").forEach((element) => element.remove());
    liveEditor.querySelectorAll(".review-flagged-component").forEach((element) => {
      element.classList.remove("review-flagged-component", "review-flag-error");
      element.removeAttribute("data-review-issues");
    });
    const flaggedComponents = /* @__PURE__ */ new Map();
    getDocumentIssueGroups().forEach((group) => {
      group.targets.forEach((target) => {
        var _a2;
        const path = getElementPath(target, inputHTML2);
        let liveTarget = path ? getElementByPath(liveEditor, path) : null;
        if (!liveTarget) return;
        if (liveTarget.matches("table") && ((_a2 = liveTarget.parentElement) == null ? void 0 : _a2.matches(".table-responsive"))) {
          liveTarget = liveTarget.parentElement;
        } else if (liveTarget.matches("img")) {
          liveTarget = liveTarget.closest("figure") || liveTarget.parentElement;
        }
        if (!liveTarget || liveTarget === liveEditor) return;
        const labels = (liveTarget.dataset.reviewIssues || "").split("|").filter(Boolean);
        if (!labels.includes(group.label)) labels.push(group.label);
        liveTarget.dataset.reviewIssues = labels.join("|");
        liveTarget.classList.add("review-flagged-component");
        if (group.severity === "error") liveTarget.classList.add("review-flag-error");
        const issueKey = getReviewIssueKey(group.label, path);
        if (!flaggedComponents.has(liveTarget)) flaggedComponents.set(liveTarget, []);
        flaggedComponents.get(liveTarget).push({ issueKey, label: group.label, severity: group.severity });
      });
    });
    flaggedComponents.forEach((issues, liveTarget) => {
      const flag = document.createElement("span");
      const severity = issues.some((issue) => issue.severity === "error") ? "error" : "warning";
      const summary = issues.map((issue) => `${issue.severity === "error" ? "Error" : "Warning"} \u2014 ${issue.label}`).join("; ");
      flag.className = `review-flag-button review-flag-button-${severity}`;
      flag.setAttribute("role", "button");
      flag.setAttribute("tabindex", "0");
      flag.setAttribute("contenteditable", "false");
      flag.setAttribute("aria-label", `Open review: ${summary}`);
      flag.setAttribute("title", summary);
      flag.textContent = "\u2691";
      if (issues.length > 1) {
        const count = document.createElement("span");
        count.className = "review-flag-count";
        count.textContent = String(issues.length);
        flag.appendChild(count);
      }
      flag.addEventListener("mousedown", (event) => event.preventDefault());
      flag.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openReviewIssue(issues[0].issueKey);
      });
      flag.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        openReviewIssue(issues[0].issueKey);
      });
      liveTarget.appendChild(flag);
    });
    updateLiveReviewFlagVisibility();
  }
  function updateLiveReviewFlagVisibility() {
    var _a2;
    if (!liveEditor) return;
    const reviewIsActive = Boolean((_a2 = document.getElementById("issuesPane")) == null ? void 0 : _a2.classList.contains("active"));
    const shouldShow = drawers.activity.isOpen() && reviewIsActive && (!reviewFlagsToggle || reviewFlagsToggle.checked);
    liveEditor.classList.toggle("review-flags-visible", shouldShow);
  }
  function getReviewIssueKey(label, path) {
    return `${label}:${Array.isArray(path) ? path.join(".") : ""}`;
  }
  function openReviewIssue(issueKey) {
    drawers.activity.setOpen(true);
    switchReviewTab("issuesPane");
    const row = Array.from((documentIssues == null ? void 0 : documentIssues.querySelectorAll("[data-review-issue]")) || []).find((item) => item.dataset.reviewIssue === issueKey);
    if (!row) return;
    row.scrollIntoView({ block: "center", behavior: "smooth" });
    row.classList.remove("report-issue-row-target");
    void row.offsetWidth;
    row.classList.add("report-issue-row-target");
    row.focus({ preventScroll: true });
    window.setTimeout(() => row.classList.remove("report-issue-row-target"), 1800);
  }
  function goToReviewError(path) {
    var _a2;
    if (!path || !Array.isArray(path)) return;
    scrollEditorsToElementPath(path);
    let liveTarget = getElementByPath(liveEditor, path);
    if ((liveTarget == null ? void 0 : liveTarget.matches("table")) && ((_a2 = liveTarget.parentElement) == null ? void 0 : _a2.matches(".table-responsive"))) liveTarget = liveTarget.parentElement;
    if (liveTarget == null ? void 0 : liveTarget.matches("img")) liveTarget = liveTarget.closest("figure") || liveTarget.parentElement;
    if (liveTarget) {
      liveTarget.classList.remove("review-flag-target");
      void liveTarget.offsetWidth;
      liveTarget.classList.add("review-flag-target");
      window.setTimeout(() => liveTarget.classList.remove("review-flag-target"), 1800);
    }
  }
  function updateHtmlPreview() {
    if (!htmlPreview) {
      return;
    }
    if (!hasInput()) {
      htmlPreview.innerHTML = '<p class="text-muted">A lightweight rendered preview will appear here.</p>';
      return;
    }
    const clone = inputHTML2.cloneNode(true);
    clone.querySelectorAll("script, style, link").forEach((element) => element.remove());
    htmlPreview.innerHTML = clone.innerHTML;
  }
  function getDocumentStats() {
    return analyzeDocument(inputHTML2).stats;
  }
  function hasInput() {
    return inputHTML2.textContent.trim() !== "" || inputHTML2.children.length > 0;
  }
  function addProcessingLog(message, type = "info") {
    if (!processingLog) {
      return;
    }
    if (logCount === 0) {
      processingLog.innerHTML = "";
    }
    logCount += 1;
    const item = document.createElement("li");
    const labelClass = type === "success" ? "label-success" : type === "warning" ? "label-warning" : type === "danger" ? "label-danger" : "label-info";
    const labelText = type === "success" ? "Done" : type === "warning" ? "Warning" : type === "danger" ? "Error" : "Info";
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    item.className = "mrgn-bttm-sm";
    item.innerHTML = `<span class="label ${labelClass}">${labelText}</span> <span class="text-muted">${time}</span> ${escapeHTML(message)}`;
    processingLog.insertBefore(item, processingLog.firstChild);
    if (!drawers.activity.isOpen()) {
      showActivityToast(message, type, labelText);
    }
  }
  function showActivityToast(message, type, labelText) {
    if (!toastRegion) {
      return;
    }
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `<strong>${escapeHTML(labelText)}</strong><span>${escapeHTML(message)}</span>`;
    toastRegion.prepend(toast);
    while (toastRegion.children.length > 3) {
      toastRegion.lastElementChild.remove();
    }
    setTimeout(() => {
      toast.remove();
    }, 4200);
  }
  function escapeHTML(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
