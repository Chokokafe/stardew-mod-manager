const fs = require('fs')
const extract = require("extract-zip")
const stripJsonComments = require('strip-json-comments');
const path = require('node:path')
const fetch = require('node-fetch')

function findFiles(dir, filename, fileList = []) {
    // Lire le contenu du répertoire
    const files = fs.readdirSync(dir);
    // Parcourir chaque fichier/dossier dans le répertoire
    files.forEach((file) => {
        // Chemin complet du fichier/dossier
        const filePath = path.join(dir, file);
        
        // Vérifier si c'est un dossier ou un fichier
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Si c'est un dossier, appeler récursivement findFiles
            findFiles(filePath, filename, fileList);
        } else if (file === filename) {
            // Si c'est un fichier et que le nom correspond, ajouter à la liste
            fileList.push(filePath);
            
        }
    
        });
        return fileList;
    }

module.exports = {
    extractFiles : async function(source, target) {
        let files = fs.readdirSync(source) //'./Mods/'
    for (let file of files) {
        console.log(`Extraction de ${file}`)
        await extract(path.resolve(source + "/" + file), { dir: path.resolve(target) }) // `./Mods/${file}` et  "./extracted"
        }
    },
    findFiles : function(dir, filename, fileList = []) {
    // Lire le contenu du répertoire
    const files = fs.readdirSync(dir);
    // Parcourir chaque fichier/dossier dans le répertoire
    files.forEach((file) => {
        // Chemin complet du fichier/dossier
        const filePath = path.join(dir, file);
        
        // Vérifier si c'est un dossier ou un fichier
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Si c'est un dossier, appeler récursivement findFiles
            findFiles(filePath, filename, fileList);
        } else if (file === filename) {
            // Si c'est un fichier et que le nom correspond, ajouter à la liste
            fileList.push(filePath);
            
        }
    
        });
        return fileList;
    },
    readManifest : function(filePath) {
        let data = fs.readFileSync(filePath,'utf-8')
        if (data.charCodeAt(0) === 0xFEFF) {data = data.slice(1);}
        data = stripJsonComments(data) // élimine les commentaires
        data = data.replace(/,\s*([\]}])/g, '$1'); // élimine les virgules de fin d'objet
        data = JSON.parse(data)
        return data
    },
    createModObject : function(fileData) {
        let modName = fileData.Name
        let modId = fileData.UniqueID
        let modKey = parseInt(fileData.UpdateKeys[0].replace(/\D/g, ''))
        let modVersion = fileData.Version
        let modAuthor = fileData.Author
        return {name : modName, id : modId, key : modKey, version : modVersion, author: modAuthor} 
    },
    getDependenciesForMod : function (fileData) {
        let dependenciesList = new Array();
        let dependencies = fileData.Dependencies
        if (dependencies) {
            dependencies.forEach(obj => {
            if (obj.IsRequired == true || !obj.hasOwnProperty('IsRequired')) {
                dependenciesList.push(obj.UniqueID)
                }
            })
        }
        let ContentPackFor = fileData.ContentPackFor
        if (ContentPackFor) {
            dependenciesList.push(fileData.ContentPackFor.UniqueID)
        }

        return dependenciesList;
    },
    generateLinkFromDependency : function (dependencyUniqueID,modList) {
        console.log(`On check le mod ${dependencyUniqueID}`)
        let modListData = JSON.parse(fs.readFileSync(modList))
        const baseAddress = "https://www.nexusmods.com/stardewvalley/mods/"
        let UniqueIDSplit = dependencyUniqueID.split('.')
        let modAuthor = UniqueIDSplit[0].toLowerCase()
        console.log(`Auteur : ${modAuthor}`)
        let modName = UniqueIDSplit[1].toLowerCase()
        console.log(`Nom du mod : ${modName}`)
        let possibleDependencies = []
        let finalLinks = []
        for (mod of modListData) {
            if (mod.author.toLowerCase().includes(modAuthor)) {
                possibleDependencies.push(mod) // Regroupe tous les mods d'un auteur particulier
            } // END IF
        } // END FOR
        console.log(`Mods de l'auteur ${modAuthor} : ${possibleDependencies}`)
        if (possibleDependencies.length == 0) {
            for (mod of modListData) {
                if (mod.name.toLowerCase().replace(/\s/g,'').includes(modName)) {
                    finalLinks.push(baseAddress+mod.id.toString()) // regroupe tous les liens correspondant à la recherche sans regroupement d'auteur
                } // END IF
            } // END FOR
            console.log(`Mods correspondant à la recherche ${modName} : ${finalLinks}`)
            if (finalLinks.length == 0) {
                console.log("Not Found")
            } // END IF
            return finalLinks
        } // END if (possibleDependencies.length == 0)
        else {
            
            for (mod of possibleDependencies) {
                if (mod.name.toLowerCase().replace(/\s/g,'').includes(modName)) {
                    finalLinks.push(baseAddress+mod.id.toString()) // regroupe tous les liens correspondant à la recherche après regroupement d'auteur
                } // END IF
            } // END FOR
            if (finalLinks.length == 0) {
                for (mod of possibleDependencies) {
                    finalLinks.push(baseAddress+mod.id.toString()) //regroupe tous les liens d'un auteur particulier
                } //END FOR
            } // END IF
            console.log(`Mods de l'auteur ${modAuthor} et correspondant à la recherche ${modName} : ${finalLinks}`)
            return finalLinks
        } // END ELSE
    },
    getUpdatesForMod : async function (apiKey,modObject) { 
        console.log(`Checking ${modObject.name} / ${modObject.id} / ${modObject.key} / ${modObject.version}`)
        return await fetch(`https://api.nexusmods.com/v1/games/stardewvalley/mods/${modObject.key}/files.json`,
            {method: 'GET',
                headers: {'APIKEY' : apiKey}
            } // Requête chez nexusmods pour récupérer les fichiers
    
        ).then(response => {
            return response.json() // On renvoie le json pour pouvoir le traiter
        }).then(data => {
            filesToReturn = []
            if (modObject.key !== 1){
                for (let file of data.files) { // Dans les fichiers qui existent pour un mod donné
                    if ((file.category_name == "MAIN" || file.category_name == "OPTIONAL") && file.mod_version !== modObject.version) { // Si on trouve un fichier important et que la version n'est pas la même 
                        console.log(`Other Version Found : Mod : ${modObject.key}, ModVersion : ${modObject.version}, version ${file.mod_version},\n description : ${file.description}\n link : https://www.nexusmods.com/stardewvalley/mods/${modObject.key}/?tab=files&file_id=${file.file_id}`) // On affiche tout correctement dans la console pour le debug   
                        filesToReturn.push([modObject.id, file.mod_version, file.description.replace(/\[.*?\]/g, ''), `https://www.nexusmods.com/stardewvalley/mods/${modObject.key}/?tab=files&file_id=${file.file_id}`]) // et on envoie le résultat         
                    }
                    else if ((file.category_name == "MAIN" || file.category_name == "OPTIONAL") && file.mod_version == modObject.version) {
                        filesToReturn.push([modObject.id, file.mod_version, file.description.replace(/\[.*?\]/g, ''), `No updates needed`])
                    }
                }
                if (filesToReturn == []) {
                    return [[modObject.id, file.mod_version, `No updates for ${modObject.name}`, ""]]
                }
                return filesToReturn
            }
            else {
                return [[modObject.id,"",`${modObject.name} is a part of another mod or is not a mod`,``]]
            }
        })
    },
}
