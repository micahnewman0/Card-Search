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
        const cardPower = $(".card-details-main .card-text-section:contains('Power')").text().trim().match(/(\d+)\s*Power/)?.[1] || "Powerless";
        const cardCounter = $(".card-details-main .card-text-section:contains('Counter')").text().trim().match(/(\d+)\s*Counter/)?.[1] || "Counterless";
        const cardImage = $(".card-image img").attr("src") || $(".card-image img").attr("data-src")
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
        const cardPrice = $(".card-price").eq(0).text().trim();

        let triggerText = "No Trigger";
        let triggerItem = cardText.find(text => text.includes("[Trigger]"));
        if (triggerItem) {
            triggerText = triggerItem.match(/\[Trigger\]\s*(.*)/)?.[0]?.trim() || "";
        }



        let ccardText = cardText.map(text => text.includes("[Trigger]") ? text.replace(/\[Trigger\].*/, "").trim() : text).filter(text => text.length > 0);

        const fullImageURL = "https://onepiece.limitlesstcg.com" + cardImage;

        let hrefText = "";
        if (cardImage.includes("https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com")) {
            hrefText = cardImage.match(/https:\/\/limitlesstcg\.nyc3\.cdn\.digitaloceanspaces\.com\/(.*)/)?.[1]?.trim() || "";
            hrefText = "index.html/" + hrefText.replace(/\.webp.*/i, "");
        }

        // Creates Card Image Link //
        if (cardImage && !cardImage.startsWith("http")) {
            cardImage = "https://onepiece.limitlesstcg.com" + cardImage;
        }
        const altArtTags = [
            "_p1_", "_p2_", "_p3_", "_p4_", "_p5_", "_p6_", "_p7_",
            "_p8_", "_p9_", "_p10_", "_p11_", "_p12_", "_p13_", "_p14_", "_p15_", "_p16_"
        ];
        
        let isAltArt = altArtTags.some(tag => cardImage.includes(tag));
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
            Price: cardPrice,
            AltArt: isAltArt,
            href: hrefText
        };

    // Catches any errors in 'scrapeCardDetails and reports them//
    } catch (error) {
        console.error('ERROR FAILED TO SCRAPE ' + url + ': ' + error);
        return null;
    }
}