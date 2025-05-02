const csvData = ``.trim();

function parseMessyCSV(csv) {
  const lines = csv.trim().split('\n');
  const rows = [];

  for (const line of lines) {
    let parts = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === ',' && !insideQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    parts.push(current.trim());

    // Теперь гарантируем, что будет 4 поля: [weekday, time, header, content]
    // Если больше 4 — склеиваем всё между 2 и последним в "header"
    if (parts.length > 4) {
      const [weekday, time, ...rest] = parts;
      const header = rest.slice(0, rest.length - 1).join(', ');
      const content = rest[rest.length - 1];
      rows.push([weekday, time, header, content]);
    } else {
      rows.push(parts);
    }
  }

  return rows;
}

const rows = parseMessyCSV(csvData);
const delay = ms => new Promise(res => setTimeout(res, ms));

function getElementByXPath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}


async function runAutomation() {
  for (let i = 0; i < rows.length; i++) {
    const [weekdayRaw, time, header, content] = rows[i];
    const weekday = weekdayRaw.trim().toUpperCase();

    const addButton = getElementByXPath('//*[@id="app"]/main/section/div[2]/button[1]');
    if (!addButton) return console.error("❌ Кнопка добавления пуша не найдена");
    addButton.click();
    await delay(500);

    const daySelectButton = getElementByXPath('//*[@id="app"]/main/section/div[4]/div/div/div/div/form/div[1]/div[1]/div[1]/div/button');
    if (!daySelectButton) return console.error("❌ Кнопка выбора дня недели не найдена");
    daySelectButton.click();
    await delay(300);

    const listItems = Array.from(document.querySelectorAll('li.select__dropdown-item'));
    const matchedItem = listItems.find(li => li.textContent.trim().toUpperCase() === weekday);
    if (!matchedItem) {
      console.warn(`❗ День "${weekday}" не найден`);
      continue;
    }
    matchedItem.click();
    await delay(300);

    const timeInput = getElementByXPath('/html/body/main/section/div[4]/div/div/div/div/form/div[1]/div[1]/div[2]/input');
    if (timeInput) {
      timeInput.value = time;
      timeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const headerInput = getElementByXPath('/html/body/main/section/div[4]/div/div/div/div/form/div[2]/div[1]/div[1]/textarea');
    if (headerInput) {
      headerInput.value = header;
      headerInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const contentInput = getElementByXPath('/html/body/main/section/div[4]/div/div/div/div/form/div[2]/div[1]/div[2]/textarea');
    if (contentInput) {
      contentInput.value = content;
      contentInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await delay(300);

    const saveButton = getElementByXPath('//*[@id="app"]/main/section/div[4]/div/div/div/div/form/div[1]/div[3]/div/button');
    if (saveButton) {
      saveButton.click();
    } else {
      console.warn("❗ Кнопка сохранения не найдена");
      continue;
    }

    await delay(1000);
  }

  console.log("✅ Все строки из CSV обработаны");
}

runAutomation();