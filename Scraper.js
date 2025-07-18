// Loads axios, cheerio, and fileSync //
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Set P-limit // 
let pLimit;
(async () => {
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(5); // Only 5 requests at a time
    await testScrape(limit); // pass it into the function
})();


async function testScrape(limit) {
    try {
        // Creates blank array for links to all sets //
        let setLinks = [];
        const setResponse = await axios.get("https://onepiece.limitlesstcg.com/cards");
        const $ = cheerio.load(setResponse.data);

        const setResponse2 = await axios.get("https://onepiece.limitlesstcg.com/cards/promos");
        const $$ = cheerio.load(setResponse2.data)

        $(".md-only a").each((index, element) => {
            const rLink = $(element).attr("href");
            if (rLink) {
                // Creates and adds link to relavent card to list //
                const fLink = "https://onepiece.limitlesstcg.com" + rLink;
                setLinks.push(fLink);
            }
        });
            $$(".md-only a").each((index, element) => {
            const rLink = $$(element).attr("href");
            if (rLink) {
                // Creates and adds link to relavent card to list //
                const fLink = "https://onepiece.limitlesstcg.com" + rLink;
                setLinks.push(fLink);
            }
        });
        console.log("Found set links: " + setLinks);

        // Creates blank cardLinks array //
        let cardLinks = [];
        for (const setURL of setLinks) { 
        // Await waits for response from the website before coninuing //
        const setPage = await axios.get(setURL);
        const $$ = cheerio.load(setPage.data);

        // Searches through each photo of card and retrieves the link to information //
            $$(".card-search-grid a").each((index, element) => {
                const relativeLink = $$(element).attr("href");
                if (relativeLink) {
                    // Creates and adds link to relavent card to list //
                    const fullLink = "https://onepiece.limitlesstcg.com" + relativeLink;
                    cardLinks.push(fullLink);
                }
        
            }); 
        }
            console.log("Found card links: " + cardLinks);

        // Scrape card details with limited concurrency // 
        let index = 0;
        const limitedRequests = cardLinks.map(link =>
            limit(async () => {
                index++;
                console.log(`Scraping card ${index}/${cardLinks.length}`);
                return await scrapeCardDetails(link);
            })
        );
        // Fetch card details concurrently // 
        let cardData = await Promise.all(limitedRequests);

        // Remove failed scrapes // 
        cardData = cardData.filter(card => card !== null);

        // Card data is put into terminal using JSON file //
        console.log("All Cards: " + JSON.stringify(cardData, null, 2));
        // cardData is added to the JSON file //
        fs.writeFileSync('cards.json', JSON.stringify(cardData, null, 2));
        
    // error catch //
    } catch (error) {
            console.error("ERROR: " + error);
        }
        
    }
async function scrapeCardDetails(url) {
    try {
        // Retrieves Card Data from HTML on website //
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const cardName = $(".card-text-name").text().trim();
        const cardID = $(".card-text-id").text().trim();
        const cardType = $(".card-text-type span[data-tooltip='Category']").text().trim();
        const cardColor = $(".card-text-type span[data-tooltip='Color']").text().trim();
        const cardAffiliations = $(".card-text-section span[data-tooltip='Type']").text().trim();
        const cardAttribute = $(".card-text-section span[data-tooltip='Attribute']").text().trim();
        const cardArtist = $(".card-text-section.card-text-artist a").text().trim();
        const cardCost = $(".card-details-main .card-text-type:contains('Cost')").text().trim().match(/(\d+)\s*Cost/)?.[1] || "Costless";
        const cardPower = $(".card-details-main .card-text-section:contains('Power')")?.text().trim().match(/(\d+)\s*Power/)?.[1] || "Powerless";
        const cardCounter = $(".card-details-main .card-text-section:contains('Counter')")?.text().trim().match(/(\d+)\s*Counter/)?.[1] || "Counterless";
        let cardImage = $(".card-image img").attr("src") || $(".card-image img").attr("data-src")
        let char = false;
        if (cardType == "Character" || cardType == "Leader") {
            char = true;
        }
        let cardText = ""
        if (char == true) {
            cardText = $(".card-details-main .card-text .card-text-section").eq(2).map((index, element) => $(element).text().trim()).get().filter(text => text.length > 0);
        }
        else if (char != true) {
            cardText = $(".card-details-main .card-text .card-text-section").eq(1).map((index, element) => $(element).text().trim()).get().filter(text => text.length > 0);
        }
        
        let triggerText = "No Trigger";
        let triggerItem = cardText.find(text => text.includes("[Trigger]"));
        if (triggerItem) {
            triggerText = triggerItem.match(/\[Trigger\]\s*(.*)/)?.[0]?.trim() || "";
        }

        let ccardText = cardText.map(text => text.includes("[Trigger]") ? text.replace(/\[Trigger\].*/, "").trim() : text).filter(text => text.length > 0);

        // Creates Card Image Link //
        if (cardImage && !cardImage.startsWith("http")) {
            cardImage = "https://onepiece.limitlesstcg.com" + cardImage;
        }

        const altArtTags = [
            "_p1_", "_p2_", "_p3_", "_p4_", "_p5_", "_p6_", "_p7_",
            "_p8_", "_p9_", "_p10_", "_p11_", "_p12_", "_p13_", "_p14_", "_p15_", "_p16_"
        ];
        
        // Determine if it's an alt art based on image tag or URL parameter
        let isAltArt = altArtTags.some(tag => cardImage.includes(tag)) || url.includes('?v=');

        let cardPrice = "Price Not Found"; // Default value

        // --- PRICE EXTRACTION LOGIC ---
        // We know both regular and alt art prices use <a class="card-price usd">
        // The distinction is which specific one to pick based on 'isAltArt'.

        if (isAltArt) {
            // For Alt Art pages (e.g., URL with ?v=1), find the price specifically
            // associated with the "current" alt art version in the table.
            // Based on image_ec0875.jpg, the alt art price ($18.52) is in a <td>
            // whose parent <tr> has a sibling <td> with class "current".
            // More accurately, it's often the *second* instance of `a.card-price.usd` in the table.
            
            // First, try to find the 'current' row in the versions table
            const currentRow = $('table.card-prints-versions tr.current');
            if (currentRow.length > 0) {
                // Within the current row, find the 'a.card-price.usd'
                const currentPriceElement = currentRow.find('a.card-price.usd').eq(0);
                if (currentPriceElement.length > 0) {
                    cardPrice = currentPriceElement.text().trim();
                }
            }

            // Fallback: If the 'current' row strategy didn't find it,
            // try to find the price directly associated with "Royal Blood aa" or similar text.
            // This relies on the 'td' containing "Royal Blood aa" being sibling to the price 'td'.
            if (cardPrice === "Price Not Found") {
                const altArtLabelCell = $('td:contains("Royal Blood aa")').last(); // Use .last() in case of multiple on page
                if (altArtLabelCell.length > 0) {
                    // Assuming the price is in the next sibling <td>
                    const priceCell = altArtLabelCell.next('td');
                    const altPriceFound = priceCell.find('a.card-price.usd').text().trim();
                    if (altPriceFound) {
                        cardPrice = altPriceFound;
                    }
                }
            }

            // General fallback if all specific alt art attempts fail
            if (cardPrice === "Price Not Found") {
                 // Try the second 'a.card-price.usd' element overall, as alt art is often second
                 const secondPrice = $("a.card-price.usd").eq(1).text().trim();
                 if (secondPrice) {
                     cardPrice = secondPrice;
                 } else {
                     // As a final resort, get the first price found.
                     const firstPrice = $("a.card-price.usd").eq(0).text().trim();
                     if (firstPrice) {
                         cardPrice = firstPrice;
                     }
                 }
            }

        } else {
            // For Regular Art pages (no ?v=), we want the main (first) price.
            const regularArtPriceElement = $("a.card-price.usd").eq(0);
            if (regularArtPriceElement.length > 0) {
                cardPrice = regularArtPriceElement.text().trim();
            } else {
                // Fallback for regular art if the specific selector somehow fails
                const genericPrice = $(".card-price").eq(0).text().trim(); 
                if (genericPrice) {
                    cardPrice = genericPrice;
                }
            }
        }
        // --- END PRICE EXTRACTION LOGIC ---
        
        let hrefText = "";
        if (cardImage.includes("https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com")) {
            hrefText = cardImage.match(/https:\/\/limitlesstcg\.nyc3\.cdn\.digitaloceanspaces\.com\/(.*)/)?.[1]?.trim() || "";
            hrefText = "index.html/" + hrefText.replace(/\.webp.*/i, "");
        }


        // Returns card data //
        return {
            name: cardName,
            image: cardImage,
            Id: cardID,
            Type: cardType,
            Color: cardColor,
            Power: cardPower,
            Affiliations: cardAffiliations,
            Attributes: cardAttribute,
            Artist: cardArtist,
            Text: ccardText,
            Character: char,
            Trigger: triggerText,
            Cost: cardCost,
            Counter: cardCounter,
            Price: cardPrice, // This will now correctly be the price from the page
            AltArt: isAltArt,
            href: hrefText
        };

    // Catches any errors in 'scrapeCardDetails and reports them//
    } catch (error) {
        console.error('ERROR FAILED TO SCRAPE ' + url + ': ' + error);
        return null;
    }
}