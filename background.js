chrome.runtime.onInstalled.addListener(() => {
    console.log("Extensão instalada.");
  });
  
  chrome.action.onClicked.addListener(() => {
    console.log("Ícone clicado.");
  });
  