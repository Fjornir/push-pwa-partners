const csvData = ``.trim();
const imageBase64 = ``; // Base64 изображения для загрузки

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

// Функция ожидания появления элемента
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await delay(100);
  }
  return null;
}

// Функция ожидания исчезновения/скрытия элемента
async function waitForElementToDisappear(selector, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (!element) return true;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    await delay(100);
  }
  return false;
}

// Функция для загрузки изображения
async function uploadImage(base64Data) {
  if (!base64Data) return;
  
  try {
    // Проверяем, есть ли уже превью (чтобы отследить новое)
    const existingPreview = document.querySelector('.push__image-previews-wrap');
    const hadPreview = existingPreview !== null;
    
    // Находим кнопку загрузки изображения
    const uploadButton = document.querySelector('label.push__upload-image-button[for="push_image"]');
    if (!uploadButton) {
      console.warn("⚠️ Кнопка загрузки изображения не найдена");
      return;
    }
    
    // Находим скрытый input для файла
    const fileInput = document.getElementById('push_image');
    if (!fileInput) {
      console.warn("⚠️ Input для загрузки изображения не найден");
      return;
    }
    
    // Конвертируем base64 в Blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // Создаем File объект
    const file = new File([blob], "push_image.png", { type: blob.type });
    
    // Создаем DataTransfer для установки файла в input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    // Триггерим событие change
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log("✅ Изображение загружено, ожидаем превью...");
    
    // Только для первого пуша ждем появления превью
    if (!hadPreview) {
      const preview = await waitForElement('.push__image-previews-wrap .push__image-preview');
      if (preview) {
        console.log("✅ Превью изображения появилось");
      } else {
        console.warn("⚠️ Превью изображения не появилось, продолжаем...");
      }
    } else {
      // Для остальных пушей просто небольшая задержка
      await delay(800);
    }
  } catch (error) {
    console.error("❌ Ошибка при загрузке изображения:", error);
  }
}

async function processRow(weekdayRaw, time, header, content) {
  const weekday = weekdayRaw.trim().toUpperCase();

  console.log(`🔍 Ищем кнопку добавления...`);
  const addButton = getElementByXPath('//*[@id="app"]/main/section/div[2]/button[1]');
  if (!addButton) throw new Error("Кнопка добавления пуша не найдена");
  addButton.click();
  console.log(`✅ Кликнули добавить, ждём форму...`);

  const daySelectButton = await waitForElement('.select-base__button', 2000);
  if (!daySelectButton) throw new Error("Кнопка выбора дня недели не найдена");
  console.log(`✅ Форма открылась, кликаем день...`);
  daySelectButton.click();

  let dropdownItem = await waitForElement('li.select-base__dropdown-item', 1000);
  if (!dropdownItem) dropdownItem = await waitForElement('li.select__dropdown-item', 1000);
  if (!dropdownItem) throw new Error("Выпадающий список дней не открылся");
  console.log(`✅ Дропдаун открылся`);

  const listItems = Array.from(document.querySelectorAll('li.select-base__dropdown-item, li.select__dropdown-item'));
  const matchedItem = listItems.find(li => li.textContent.trim().toUpperCase() === weekday);
  if (!matchedItem) throw new Error(`День "${weekday}" не найден в списке: ${listItems.map(li => li.textContent.trim()).join(', ')}`);
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

  if (imageBase64) await uploadImage(imageBase64);

  const saveButton = Array.from(document.querySelectorAll('button[type="submit"].button--variant-primary'))
    .find(btn => btn.textContent.includes('Добавить пуш'));
  if (!saveButton) throw new Error("Кнопка сохранения не найдена");
  console.log(`✅ Кликаем сохранить, ждём закрытия модалки...`);
  saveButton.click();

  // Ждём пока модалка закроется
  const closed = await waitForElementToDisappear('.modal-content', 10000);
  if (!closed) {
    console.warn(`⚠️ Модалка не закрылась за 10с, .modal-content в DOM: ${!!document.querySelector('.modal-content')}`);
    throw new Error("Форма не закрылась после сабмита");
  }
  console.log(`✅ Модалка закрылась`);
  await delay(300);
}

async function runAutomation() {
  const MAX_RETRIES = 3;
  console.log(`🚀 Запуск, строк в CSV: ${rows.length}`);

  for (let i = 0; i < rows.length; i++) {
    const [weekdayRaw, time, header, content] = rows[i];
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await processRow(weekdayRaw, time, header, content);
        console.log(`✅ [${i + 1}/${rows.length}] Строка добавлена`);
        success = true;
        break;
      } catch (err) {
        console.warn(`⚠️ [${i + 1}/${rows.length}] Попытка ${attempt}/${MAX_RETRIES}: ${err.message}`);
        if (attempt < MAX_RETRIES) await delay(500);
      }
    }

    if (!success) console.error(`❌ [${i + 1}/${rows.length}] Строка пропущена после ${MAX_RETRIES} попыток`);
  }

  console.log("✅ Все строки из CSV обработаны");
}

runAutomation();