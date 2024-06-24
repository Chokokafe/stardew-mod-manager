const { ipcRenderer } = require('electron')
const fs = require('fs')
const extract = require("extract-zip")
const stripJsonComments = require('strip-json-comments');
const path = require('node:path')
const fetch = require('node-fetch')
const dependencyextract = require('./dependencyextract')

const contentPara = document.getElementById("content")

const extractFiles = document.getElementById("extractFiles")
extractFiles.addEventListener('click', function (event) {
    //console.log("Selecting folder... (render)")
    ipcRenderer.send('open-dir')
})

const installed = document.getElementById("installed")
installed.addEventListener('click', function (event) {showInstalled(contentPara,modsInstalled)} )
const toInstall = document.getElementById("toInstall")
toInstall.addEventListener('click', function (event) {showToInstall(contentPara,dependenciesNeeded,dependenciesNeededLinks)})
const toUpdate = document.getElementById("toUpdate")
toUpdate.addEventListener('click', function (event) {showToUpdate(contentPara,modsToUpdateData)})

ipcRenderer.on('selectedItem',async function (event,path) {await extractDependencies(path)})

function showToUpdate(tag, mods) {
    tag.innerHTML = ""
    for (let mod of mods) {
        let container = document.createElement("div")
        container.setAttribute("class","modUpdate")
        let title = document.createElement("h1")
        title.innerHTML = mod[0][0]
        container.appendChild(title)
        for (let file of mod) {
            let subcontainer = document.createElement("div")
            subcontainer.setAttribute("class","modUpdateFile")
            let version = document.createElement("p")
            version.innerHTML = `Version : ${file[1]}`
            subcontainer.appendChild(version)
            let description = document.createElement("p")
            description.innerHTML = `Description : ${file[2]}`
            subcontainer.appendChild(description)
            let link = document.createElement("p")
            link.innerHTML = `Link : ${file[3]}`
            subcontainer.appendChild(link)
            container.appendChild(subcontainer)
        }
        tag.appendChild(container)
    }
}

function showToInstall(tag, dependencies,links) {
    tag.innerHTML = ""
    let counter = 0
    for (let dependency of dependencies) {
        let container = document.createElement("div")
        container.setAttribute("class","modToInst")
        let title = document.createElement("p")
        title.innerHTML = `${dependency} : ${links[counter]}`
        container.appendChild(title)
        tag.appendChild(container)
        counter++
    }
}

function showInstalled(tag, mods) {
    tag.innerHTML = ""
    for (let mod of mods) {
        let container = document.createElement("div")
        container.setAttribute("class","modInst")
        let title = document.createElement("h1")
        title.innerHTML = `${mod.name} - ${mod.author}`
        container.appendChild(title)
        let version = document.createElement("p")
        version.innerHTML = `${mod.version}`
        container.appendChild(version)
        tag.appendChild(container)
    }
}

let modsInstalled = []
let dependenciesNeeded = []
let dependenciesNeededLinks = []
let modsInstalledNames = []
let modsToUpdate = []
let modsToUpdateData = []

async function extractDependencies(path) {
  try {
    modsInstalled = []
    dependenciesNeeded = []
    modsInstalledNames = [] 
    modsToUpdate = []
    modsToUpdateData = []
    dependenciesNeededLinks = []
    console.log("Extracting...")
    await dependencyextract.extractFiles(path[0], "./extracted")
    console.log("Done !")
    foundFilePaths = dependencyextract.findFiles('./extracted',"manifest.json") //trouver tous les fichiers
    for (let filePath of foundFilePaths) {
        fileData = dependencyextract.readManifest(filePath)
        modObject = dependencyextract.createModObject(fileData) // name, id (lettres), key (sur le site)
        console.log(modObject)
        modsInstalled.push(modObject)
        modsInstalledNames.push(modObject.name)
        modDependencies = dependencyextract.getDependenciesForMod(fileData)
        for (let dependency of modDependencies) {
            if (!dependenciesNeeded.includes(dependency)){
                dependenciesNeeded.push(dependency)
            }
        }
        for (let mod of modsInstalled) {
            for (let dependency of dependenciesNeeded) {
                if (mod.id == dependency) {
                    dependenciesNeeded.splice(dependenciesNeeded.indexOf(dependency),1)
                }
            }
        }
        if (dependenciesNeeded.length>0) {
            let finalStr = ""
            for (let mod of dependenciesNeeded) {
                finalStr += mod
                finalStr += ", "
            }
    }
}
    console.log("Dependencies Needed : " + dependenciesNeeded)
    console.log("Dependencies Installed : " + modsInstalledNames)
    for (let dependency of dependenciesNeeded) {
        let dependencyLink = dependencyextract.generateLinkFromDependency(dependency, "modlistdefinitive.json")
        console.log(dependencyLink)
        dependenciesNeededLinks.push(dependencyLink)
    }
    /// VERIFICATION DES UPDATES

        for (modObject of modsInstalled) { // On prend chaque mod de la liste
            console.log(modObject.id + " checked")
                modsToUpdate.push(await dependencyextract.getUpdatesForMod("TW5uzaxczaOdUiZWe5uT79uwf+5x2lLlBQ5fpzrYd/ssrmzIjAnm--FInd93bplxTAWw6C--hP6hjiNNeQe7AABTd5hGSQ==",modObject).then(result => {modsToUpdateData.push(result)})) // On récupère les fichiers qui sont supposés plus récents 
            }
      //console.log(dependencyextract.generateLinkFromDependency("selph.ExtraMachineConfig","modlist_test.json"))
    }
    
    
    catch (err) {console.error(err)}
}
