"""Браузерная проверка: pip install playwright; запустить HTTP-сервер на 8000 из /workspace."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL='http://127.0.0.1:8000/NPC-Generator-Glufonde/'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(accept_downloads=True)
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.wait_for_selector('.npc-name')
 for width in [320,375,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900})
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Переполнение {width}'
  for category in ['Мужчина','Женщина','Мальчик','Девочка']:
   page.get_by_role('button',name=category,exact=True).click();page.locator('#generate').click()
   assert page.locator('.npc-name').inner_text()
  page.locator('#library-tab').click()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.locator('#generator-tab').click()
 print('Размеры экрана и 4 категории: 320, 375, 390, 768, 1440 — успешно')
 page.get_by_role('button',name='Закрепить: Место рождения',exact=True).click()
 original=page.locator('.npc-meta').inner_text().split('Место рождения: ')[-1]
 for _ in range(5):page.locator('#generate').click();assert page.locator('.npc-meta').inner_text().endswith(original)
 page.get_by_role('button',name='Заново: Имя и фамилия',exact=True).click()
 page.locator('#hide-gm').check();assert page.get_by_role('heading',name='Информация мастера',exact=True).count()==0
 page.locator('#edit').click();assert page.locator('[name=awareness]').count()==0
 page.locator('[name=name]').fill('Ядвига Каминская');page.get_by_role('button',name='Применить изменения').click()
 assert page.locator('.npc-name').inner_text()=='Ядвига Каминская'
 page.locator('#save').click();assert page.locator('#count').inner_text()=='1'
 page.reload();page.wait_for_selector('.npc-name');page.locator('#library-tab').click()
 assert page.locator('.saved-card h3').inner_text()=='Ядвига Каминская'
 with page.expect_download() as pending:page.locator('#export').click()
 exported=json.loads(Path(pending.value.path()).read_text());assert len(exported['npcs'])==1
 page.locator('#import').set_input_files({'name':'archive.json','mimeType':'application/json','buffer':json.dumps(exported).encode()})
 expect(page.locator('.saved-card')).to_have_count(2)
 page.locator('#search').fill('каминская');expect(page.locator('.saved-card')).to_have_count(2)
 page.locator('.saved-card').first.get_by_role('button',name='Открыть').click()
 page.locator('#edit').click();page.locator('[name=name]').fill('Агата Новак');page.get_by_role('button',name='Применить изменения').click()
 page.locator('#update').click();page.locator('#confirm-yes').click()
 page.locator('#library-tab').click();page.locator('#search').fill('Агата');expect(page.locator('.saved-card')).to_have_count(1)
 page.locator('.saved-card').get_by_role('button',name='Удалить').click();page.locator('#confirm-yes').click();assert page.locator('#count').inner_text()=='1'
 page.locator('#search').fill('');page.locator('#import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{invalid'})
 assert 'JSON' in page.locator('#status').inner_text();expect(page.locator('.saved-card')).to_have_count(1)
 print('Закрепление, регенерация, приватность, редактирование, сохранение, перезагрузка, обновление, импорт, экспорт, поиск, удаление и повреждённый файл — успешно')
 page.locator('#generator-tab').click();page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path='/tmp/npc-desktop.png',full_page=True)
 page.set_viewport_size({'width':320,'height':900});page.screenshot(path='/tmp/npc-mobile.png',full_page=True)
 page.wait_for_function("document.querySelector('#offline-status').textContent==='Готов к работе без сети'")
 context.set_offline(True);page.reload();page.wait_for_selector('.npc-name');page.locator('#generate').click();assert page.locator('.npc-name').inner_text()
 page.locator('#library-tab').click();expect(page.locator('.saved-card')).to_have_count(1)
 assert not errors,errors
 print('Офлайн-перезагрузка, генерация и библиотека в подпапке; ошибок JavaScript нет — успешно')
 browser.close()
