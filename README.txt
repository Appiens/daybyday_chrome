Исходники на GitHub содержат в себе сразу 2 версии: тестовую и релиз
Bat файл makeCRXFolder создает из папки с исходниками 2 папки:
day-by-day-chrome-master-crx, day-by-day-chrome-master-zip.

отличаются 2 версии лишь иконками и манифестом. манифестом для тестовой версии служит файл manifestCrx.json.

В гугле необходимо зайти в меню Настройки / Расширения,
там должна стоять галка DevelopersMode.

Выбрать Pack Extension, папку day-by-day-chrome-master-crx  и ключ 
daybyday_chrome-master.pem. 
 Созданный файл crx перетащить в расширения.
------------

 