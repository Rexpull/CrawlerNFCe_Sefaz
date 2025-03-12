document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("process-xml").addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        func: () => {
                            const chaveAcesso = document.querySelector("#formPrincipal\\:j_idt104_content h5")?.innerText.trim().replace(/\D/g, "");
                            const digestValue = document.querySelector(".table-responsive:nth-of-type(2) table.table-hover:nth-of-type(2) tbody tr td:nth-child(3)")?.innerText.trim();
                            const protocolo = document.querySelector(".ui-fieldset-content table.table-hover tbody tr td:nth-child(2)")?.innerText.trim();
                            const dtAuto = document.querySelector(".ui-fieldset-content table.table-hover tbody tr td:nth-child(3)")?.innerText.trim();
                            return { chaveAcesso, digestValue, protocolo, dtAuto };
                        },
                    },
                    (injectionResults) => {
                        if (chrome.runtime.lastError) {
                            document.getElementById("status").innerText = "Erro ao capturar dados da aba ativa.";
                            console.error(chrome.runtime.lastError.message);
                            return;
                        }

                        const result = injectionResults[0]?.result;
                        if (result) {
                            processXML(result);
                        } else {
                            document.getElementById("status").innerText = "Nenhum dado encontrado na página.";
                        }
                    }
                );
            } else {
                document.getElementById("status").innerText = "Nenhuma aba ativa encontrada.";
            }
        });
    });

    function processXML(pageData) {
        const inputXML = document.getElementById("input-xml").value;

        if (!inputXML.trim()) {
            document.getElementById("status").innerText = "Por favor, insira um XML válido.";
            return;
        }

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(inputXML, "application/xml");

            // Remove tags desnecessárias
            const idLote = xmlDoc.querySelector("idLote");
            if (idLote) idLote.parentNode.removeChild(idLote);

            const indSinc = xmlDoc.querySelector("indSinc");
            if (indSinc) indSinc.parentNode.removeChild(indSinc);

            // Verifica ou cria o elemento raiz <nfeProc>
            let nfeProc = xmlDoc.querySelector("nfeProc");
            if (!nfeProc) {
                const nfe = xmlDoc.querySelector("NFe");
                if (!nfe) {
                    throw new Error("Nenhuma tag <NFe> encontrada no XML.");
                }

                nfeProc = xmlDoc.createElement("nfeProc");
                nfeProc.setAttribute("versao", "4.00");
                nfeProc.setAttribute("xmlns", "http://www.portalfiscal.inf.br/nfe");

                nfeProc.appendChild(nfe);

                // Substitui o elemento raiz pelo <nfeProc>
                const oldRoot = xmlDoc.documentElement;
                xmlDoc.replaceChild(nfeProc, oldRoot);
            }

            // Verifica ou cria a tag <protNFe>
            let protNFe = nfeProc.querySelector("protNFe");
            if (!protNFe) {
                protNFe = xmlDoc.createElement("protNFe");
                protNFe.setAttribute("versao", "4.00");
                nfeProc.appendChild(protNFe);
            }

            // Verifica ou cria a tag <infProt>
            let infProt = protNFe.querySelector("infProt");
            if (!infProt) {
                infProt = xmlDoc.createElement("infProt");
                infProt.setAttribute("Id", `ID${pageData.protocolo || "000000000000000"}`);
                protNFe.appendChild(infProt);
            }

            // Atualiza ou cria as tags dentro de <infProt>
            updateOrCreateTag(xmlDoc, infProt, "tpAmb", "1");
            updateOrCreateTag(xmlDoc, infProt, "verAplic", "W-1.5.43");
            updateOrCreateTag(xmlDoc, infProt, "chNFe", pageData.chaveAcesso || "chNFe não encontrada");
            updateOrCreateTag(xmlDoc, infProt, "dhRecbto", formatDate(pageData.dtAuto) || "0000-00-00T00:00:00-03:00");
            updateOrCreateTag(xmlDoc, infProt, "nProt", pageData.protocolo || "000000000000000");
            updateOrCreateTag(xmlDoc, infProt, "digVal", pageData.digestValue || "EXEMPLO_DIGVAL");
            updateOrCreateTag(xmlDoc, infProt, "cStat", "100");
            updateOrCreateTag(xmlDoc, infProt, "xMotivo", "Autorizado o uso da NF-e");

            // Serializa o XML atualizado de volta para texto
            const serializer = new XMLSerializer();
            const updatedXML = serializer.serializeToString(xmlDoc);

            // Copia o XML processado para a área de transferência
            navigator.clipboard.writeText(updatedXML).then(() => {
                document.getElementById("status").innerText = "XML processado e copiado para a área de transferência!";
            }).catch(err => {
                document.getElementById("status").innerText = "Erro ao copiar para a área de transferência.";
                console.error(err);
            });
        } catch (error) {
            document.getElementById("status").innerText = "Erro ao processar o XML.";
            console.error("Erro ao processar o XML:", error);
        }
    }

    function updateOrCreateTag(xmlDoc, parent, tagName, textContent) {
        let tag = parent.querySelector(tagName);
        if (!tag) {
            tag = xmlDoc.createElement(tagName);
            parent.appendChild(tag);
        }
        tag.textContent = textContent;
    }

    // Formata a data de DD/MM/YYYY HH:MM:SS para o formato "YYYY-MM-DDTHH:MM:SS-03:00"
    function formatDate(dateString) {
        if (!dateString) return null;
        const [datePart, timePart] = dateString.split(" ");
        const [day, month, year] = datePart.split("/");
        return `${year}-${month}-${day}T${timePart}-03:00`;
    }
});
