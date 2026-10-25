"""Проверка DOCX в браузере и чтение через python-docx (зависимости только для разработки)."""
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from docx import Document
from playwright.sync_api import sync_playwright, expect
import os
URL=os.environ.get('NPC_TEST_URL','http://127.0.0.1:8000/NPC-Generator-Glufonde/')
def inspect(download):
 path=download.path()
 with zipfile.ZipFile(path) as archive:
  assert archive.testzip() is None
  for name in archive.namelist():ET.fromstring(archive.read(name))
 return '\n'.join(p.text for p in Document(path).paragraphs)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(accept_downloads=True);page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.wait_for_selector('.npc-name')
 assert page.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(0, 0, 0)'
 assert page.evaluate("getComputedStyle(document.body).color")=='rgb(255, 210, 63)'
 names=[page.locator('.npc-name').inner_text()]
 for _ in range(3):page.locator('#generate').click();names.append(page.locator('.npc-name').inner_text())
 expect(page.locator('#history-count')).to_have_text('4')
 page.get_by_role('button',name='Заново: Настроение',exact=True).click()
 expect(page.locator('#history-count')).to_have_text('4')
 page.locator('#edit').click();page.locator('[name=name]').fill('Ян <Краузе> & сын');page.get_by_role('button',name='Применить изменения').click();names[-1]='Ян <Краузе> & сын'
 with page.expect_download() as pending:page.locator('#export-history-docx').click()
 text=inspect(pending.value)
 for name in names:assert name in text
 assert text.count('Информация мастера')==4
 with page.expect_download() as pending:page.locator('#export-current-docx').click()
 assert pending.value.suggested_filename=='glufonde-npc.docx'
 text=inspect(pending.value);assert names[-1] in text;assert 'Персонажей: 1' in text;assert 'Информация мастера' in text
 page.locator('#hide-gm').check()
 with page.expect_download() as pending:page.locator('#export-current-docx').click()
 text=inspect(pending.value);assert 'Осведомлённость' not in text
 with page.expect_download() as pending:page.locator('#export-current').click()
 assert pending.value.suggested_filename=='glufonde-npc.json'
 import json
 assert len(json.loads(Path(pending.value.path()).read_text())['npcs'])==1
 with page.expect_download() as pending:page.locator('#export-history-docx').click()
 text=inspect(pending.value);assert 'Информация мастера' not in text;assert 'Осведомлённость' not in text
 page.locator('#save').click();page.locator('#library-tab').click()
 with page.expect_download() as pending:page.locator('#export-library-docx').click()
 text=inspect(pending.value);assert 'Персонажей: 1' in text;assert names[-1] in text;assert 'Осведомлённость' not in text
 page.reload();page.wait_for_selector('.npc-name');expect(page.locator('#history-count')).to_have_text('5')
 page.locator('#history-tab').click();expect(page.locator('#history-list article')).to_have_count(5)
 for width in [320,375,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
  page.locator('#generator-tab').click();assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),width
  page.locator('#history-tab').click()
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/tmp/npc-yellow-mobile.png',full_page=True)
 page.locator('#generator-tab').click();page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path='/tmp/npc-yellow-desktop.png',full_page=True)
 page.wait_for_function("document.querySelector('#offline-status').textContent==='Готов к работе без сети'")
 context.set_offline(True);page.reload();page.wait_for_selector('.npc-name');page.locator('#generate').click()
 with page.expect_download() as pending:page.locator('#export-history-docx').click()
 assert 'Персонажей: 7' in inspect(pending.value)
 page.locator('#history-tab').click();page.locator('#clear-history').click();page.locator('#confirm-yes').click();expect(page.locator('#count')).to_have_text('1');expect(page.locator('#history-count')).to_have_text('0');expect(page.locator('#export-history-docx-list')).to_be_disabled()
 assert not errors,errors
 print('Успешно: цвета RollSet, история, редактирование без дубликатов, перезагрузка, DOCX с/без сведений мастера, ZIP/XML, python-docx, 5 ширин, офлайн-экспорт, очистка истории.')
 browser.close()
