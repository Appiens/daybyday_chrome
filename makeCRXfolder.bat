@echo Copying daybyday_chrome-master folder to crx...
rmdir /s /q  day-by-day-chrome-master-crx
mkdir day-by-day-chrome-master-crx
xcopy daybyday_chrome day-by-day-chrome-master-crx /E /C /I /Q /H /Y

@echo Deleting unused files and folders from day-by-day-chrome-master-crx...
rmdir /s /q  day-by-day-chrome-master-crx\.git
rmdir /s /q  day-by-day-chrome-master-crx\.idea
del day-by-day-chrome-master-crx\.gitignore
del day-by-day-chrome-master-crx\images\daybyday16.png
del day-by-day-chrome-master-crx\images\daybyday16gray.png
del day-by-day-chrome-master-crx\manifest.json
rename day-by-day-chrome-master-crx\manifestCRX.json manifest.json
rename day-by-day-chrome-master-crx\images\icon-16.gif daybyday16.png
rename day-by-day-chrome-master-crx\images\icon-16gray.gif daybyday16gray.png

@echo Copying daydyday_chrome-master folder to zip...
rmdir /s /q  day-by-day-chrome-master-zip
mkdir day-by-day-chrome-master-zip
xcopy daybyday_chrome day-by-day-chrome-master-zip /E /C /I /Q /H /Y

@echo Deleting unused files and folders from day-by-day-chrome-master-zip...
rmdir /s /q  day-by-day-chrome-master-zip\.git
rmdir /s /q  day-by-day-chrome-master-zip\.idea
del day-by-day-chrome-master-zip\.gitignore
del day-by-day-chrome-master-zip\manifestCRX.json
del day-by-day-chrome-master-zip\images\icon-16.gif
del day-by-day-chrome-master-zip\images\icon-16gray.gif

cd day-by-day-chrome-master-zip
zip -R day-by-day-chrome *


@pause
