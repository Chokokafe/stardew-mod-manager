const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('node:path')
const extract = require('extract-zip')

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,// ACTIVATION REQUIRE
            contextIsolation: false// ACTIVATION REQUIRE
        }
    })

    mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
    let template = [{
        label: 'Menu 1',
        submenu: [{
        label: 'Menu item 1'
        }]
       }, {
        label: 'Menu 2',
        submenu: [{
        label: 'Another Menu item'
        }, {
        label: 'One More Menu Item'
        }]
       }]
   // const menu = Menu.buildFromTemplate(template)
    //Menu.setApplicationMenu(menu)
    createWindow()
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('open-dir', function (event) {
    //console.log("Selecting folder... (main)")
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }).then(function (result) { event.sender.send('selectedItem', result.filePaths) })
    //console.log("Files selected... (main)")
})