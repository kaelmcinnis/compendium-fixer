/***************************************Global Variables********************************************/
let sourceCompendiumSelector;
let targetCompendiumSelector;
let sourceCompendiumName;
let targetCompendiumName;
let targetCompendiums = [];

/***************************************Classes********************************************/
export default class CompendiumFixer extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
    mergeObject(options, {
      classes: ["compendiumfixer"],
      template: "modules/compendium-fixer/templates/compendium-fixer.html",
      width: "auto",
      height: "auto",
      resizable: false,
      minimizable: true,
      title: "Compendium Fixer",
    });
    return options;
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
    //pre-disable relevant buttons and dropdowns
    $("#" + this.id)
      .find(".smallbutton, #targetcompendiumdropdown, #fixcompendium")
      .prop("disabled", true);
    
    //identify dropdowns for later use
     sourceCompendiumSelector = $("#" + this.id).find(
      "#sourcecompendiumdropdown"
    )[0];
    targetCompendiumSelector = $("#" + this.id).find(
      "#targetcompendiumdropdown"
    )[0];

    //populate source compendium dropdown
    let availableCompendiums = game.packs.entries;
    if (sourceCompendiumSelector.options.length < availableCompendiums.length) {
      for (let i = 0; i < availableCompendiums.length; i++) {
        const element = availableCompendiums[i];
        sourceCompendiumSelector.append(new Option(element.metadata.label));
      }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    //enables source select button
    html.find("#sourcecompendiumdropdown").on("focusout", () => {
        html.find("#sourcecompendiumbutton").prop("disabled", false);
        return false;
    });
    
    //sets source compendium, cascades enables & disables, and populates target compendium dropdown
    html.find("#sourcecompendiumbutton").on("click", (ev) => {
        sourceCompendiumName = sourceCompendiumSelector.options[sourceCompendiumSelector.selectedIndex].label;
        alert("You have selected " + sourceCompendiumName + " as your source compendium.");
        //builds the target compendiums array, gets blanked on each reset
        for (let i = 0; i < availableCompendiums.length; i++) {
          const element = availableCompendiums[i];
          if (element.metadata.label != sourceCompendiumName) {
            targetCompendiums.push(element);
          }
        }
        //creates entries in our target compendium dropdown
        if (targetCompendiumSelector.options.length < targetCompendiums.length) {
            for (let i = 0; i < targetCompendiums.length; i++) {
              const element = targetCompendiums[i];
              targetCompendiumSelector.append(new Option(element.metadata.label));
            }
          }
        html.find("#formreset").prop("disabled", false);
        html.find("#targetcompendiumdropdown").prop("disabled", false);
        html.find("#sourcecompendiumdropdown").prop("disabled", true);
        $(ev.target).prop("disabled", true);
        return false;
      });;
    
    //enables source select button
    html.find("#targetcompendiumdropdown").on("focusout", () => {
        html.find("#targetcompendiumbutton").prop("disabled", false);
        return false;
    });

    //sets target compendium and cascades further enabling & disabling
    html.find("#targetcompendiumbutton").on("click", (ev) => {
        targetCompendiumName = targetCompendiumSelector.options[targetCompendiumSelector.selectedIndex].label;
        alert("You have selected " + targetCompendiumName + " as your target compendium.");
        html.find("#targetcompendiumdropdown").prop("disabled", true);
        html.find("#fixcompendium").prop("disabled", false);
        $(ev.target).prop("disabled", true);
        return false
      });;

    //runs the compendium fixing part of application
    html.find("#fixcompendium").on("click", (ev) => {
      fixCompendium(sourceCompendiumName, targetCompendiumName);
      $(ev.target).prop("disabled", true);
      return false;
    });

    //resets to everything to default values
    html.find("#formreset").on("click", () => {
        targetCompendiums = [];
        html.find(".compendiumfixer").reset();
        html.find("#targetcompendiumdropdown option:not(:first)").remove();
        html.find("#sourcecompendiumdropdown").prop("disabled", false);
        html.find(".smallbutton, #targetcompendiumdropdown, #fixcompendium").prop("disabled", true);
        return false;
      });
  }
}

/***************************************Funcitons********************************************/

function _uid(len) {
  return btoa(randomID(len))
    .replace(/[+/]/g, "")
    .slice(0, len);
  }

async function _getCompendium(compendiumName) {
  try {
    let compendium = game.packs.find(
      (p) => p.metadata.label === compendiumName
    );
    return compendium;
  } catch (err) {
    console.error(err);
  }
}

async function _generateNewIDs(sourceCompendiumContent) {
  try {
    let newIDArray = [];
    for (let i = 0; i < sourceCompendiumContent.length; i++) {
      let generatedID = _uid(16);
      newIDArray.push(generatedID);
    }
    return newIDArray;
  } catch (err) {
    console.error(err);
  }
}

async function _generateFilteredEntities(sourceCompendiumContent) {
  const filtrationTemplate = {
    name: "",
    permission: {},
    type: "",
    data: "",
    flags: {},
    img: "",
  };
  try {
    let filteredEntityArray = sourceCompendiumContent.map((entry) =>
      filterObject(entry, filtrationTemplate)
    );
    return filteredEntityArray;
  } catch (err) {
    console.error(err);
  }
}

async function _getAsyncData(sourceCompendium) {
  try {
    let sourceCompendiumContent = await sourceCompendium.getContent();

    //generate our new IDs and filtered entities then
    let asyncIDs = await _generateNewIDs(sourceCompendiumContent);
    let asyncEntities = await _generateFilteredEntities(
      sourceCompendiumContent
    );

    //allows us to export our two async-generated datasets
    let combinedData = await Promise.all([asyncIDs, asyncEntities]);
    let newIDs = combinedData[0];
    let filteredEntities = combinedData[1];

    return [newIDs, filteredEntities];
  } catch (err) {
    console.error(err);
  }
}

async function _generateFixedEntities(asyncData) {
  const entityTemplate = {
    _id: "",
    name: "",
    permission: {},
    type: "",
    data: "",
    flags: {},
    img: "",
  };
  try {
    let fixedEntityArray = [];
    for (let i = 0; i < asyncData[0].length; i++) {
      let fixedEntity = duplicate(entityTemplate);
      fixedEntity._id = asyncData[0][i];
      fixedEntity.name = asyncData[1][i].name;
      fixedEntity.permission = { default: 0 };
      fixedEntity.type = asyncData[1][i].type;
      fixedEntity.data = asyncData[1][i].data;
      fixedEntity.flags = asyncData[1][i].flags;
      fixedEntity.img = asyncData[1][i].img;
      fixedEntityArray.push(fixedEntity);
    }
    return fixedEntityArray;
  } catch (err) {
    console.error(err);
  }
}

async function _fillTargetCompendium(fixedEntityArray, targetCompendium) {
  try {
    let targetIndex = await targetCompendium.getIndex();

    fixedEntityArray.forEach((entity) => {
      if (!targetIndex.find((e) => e.name === entity.name)) {
        targetCompendium.createEntity(entity);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

//the function that matters
async function fixCompendium(sourceCompendiumName, targetCompendiumName) {
  try {
    let sourceCompendium = await _getCompendium(sourceCompendiumName);
    let targetCompendium = await _getCompendium(targetCompendiumName);
    let asyncData = await _getAsyncData(sourceCompendium);
    let fixedEntities = await _generateFixedEntities(asyncData);
    _fillTargetCompendium(fixedEntities, targetCompendium);
  } catch (err) {
    console.error(err);
  }
}

/***************************************Hooks********************************************/
Hooks.on("renderCompendiumDirectory", addButtonToCompendiumPanel);

//Add button to compendium panel
function addButtonToCompendiumPanel() {
  let html = $("#compendium");
  if (game.user.isGM) {
    const compFixButton = $(
      `<button class="create-compendium"><i class="fas fa-atlas"></i>Compendium Fixer</button>`
    );

    html.find(".directory-footer").append(compFixButton);
    compFixButton.on("click", (ev) => {
      ev.preventDefault();
      alert("here is where we fix shit");
      let compendiumFix = new CompendiumFixer();
      compendiumFix.render(true);
    });
  }
}



//PS E:\DnD> node .\FoundryVTT\resources\app\main.js --dataPath=.\FoundryUserData