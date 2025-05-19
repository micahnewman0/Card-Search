// Fetching the data from cards.json and then calling the search function
async function fetchCards() {
    const response = await fetch("cards.json");
    const cards = await response.json();
    
    // Now call the cardSearch function with the fetched data
    cardSearch(cards);
}

// Function to handle the search
function cardSearch(cards) {
    const searchBar = document.getElementById("searchBar");
    const redCards = document.getElementById("Red");
    const greenCards = document.getElementById("Green");
    const blueCards = document.getElementById("Blue");
    const purpleCards = document.getElementById("Purple");
    const blackCards = document.getElementById("Black");
    const yellowCards = document.getElementById("Yellow");

    const aaOnlyEle = document.getElementById("AltArtOnly");
    // const aaInclude = document.getElementByID("AltArtInclude");
    
    searchBar.addEventListener("input", function () {
        
        const selectedColors = [];
        if (redCards.checked) selectedColors.push("Red", "Red/Green", "Red/Blue", "Red/Purple", "Red/Black", "Red/Yellow");
        if (greenCards.checked) selectedColors.push("Green", "Red/Green", "Green/Blue", "Green/Purple", "Green/Black", "Green/Yellow");
        if (blueCards.checked) selectedColors.push("Blue", "Red/Blue", "Green/Blue", "Blue/Purple", "Blue/Black", "Blue/Yellow");
        if (purpleCards.checked) selectedColors.push("Purple", "Red/Purple", "Green/Purple", "Blue/Purple", "Purple/Black", "Purple/Yellow");
        if (blackCards.checked) selectedColors.push("Black", "Purple/Black", "Green/Black", "Blue/Black", "Red/Black", "Black/Yellow");
        if (yellowCards.checked) selectedColors.push("Yellow", "Red/Yellow", "Green/Yellow", "Blue/Yellow", "Purple/Yellow", "Black/Yellow");
        
        const aaOnlyEle = document.getElementById("AltArtOnly");

        const query = searchBar.value.toLowerCase(); // Get the query text from the search bar
        
        // Filter the cards based on query
        const filteredCards = cards.filter(card => {
            const lowerQuery = query.toLowerCase();

            const effectMatch = query.match(/3ffect:\s*(.+)/);
            if (effectMatch) {
                const effectQuery = effectMatch[1].trim();
                if (effectQuery === "") return false;

                return card.Text.some(textLine => textLine.toLowerCase().includes(effectQuery));
            }
            return (
                card.name.toLowerCase().includes(query) ||
                card.Type.toLowerCase().includes(query) ||
                card.Attributes.toLowerCase().includes(query) ||
                card.Affiliations.toLowerCase().includes(query) ||
                card.Cost.includes(query) ||
                card.Id.toLowerCase().includes(query)
        );
            
        }).filter(card =>
            selectedColors.length === 0 || selectedColors.includes(card.Color)
        ).filter(card =>
            card.AltArt === aaOnlyEle.checked
        );

        displayResults(filteredCards);
    });
}

// Function to display the filtered results
function displayResults(cards) {
    const resultsContainer = document.getElementById("results");

    resultsContainer.innerHTML = ""; // Clear old results

    if (cards.length === 0) {
        resultsContainer.innerHTML = "<p>No results found.</p>";
        return;
    }

    // Loop through and display the filtered cards
    cards.forEach(card => {

        // Create a container div for each card
        const cardContainer = document.createElement("div");
        cardContainer.className = "card";  // Optional, if you want to style cards

        cardContainer.style.position = "relative";
        // Add to deck //
        const deckAdd = document.createElement("img");
        deckAdd.src = "https://cdn-icons-png.flaticon.com/512/11527/11527831.png";
        deckAdd.alt = "Add to deck";
        deckAdd.title = "Add to deck";

        const deckMin = document.createElement("img");
        deckMin.src = "https://cdn-icons-png.flaticon.com/512/11527/11527831.png";
        deckMin.alt = "Subtract from deck";
        deckMin.title = "Subtract from deck";

        deckAdd.style.position = "absolute";
        deckAdd.style.top = "8px";       // Distance from top
        deckAdd.style.right = "-12px";     // Distance from right
        deckAdd.style.width = "50px";    // Adjust size as needed
        deckAdd.style.height = "50px";
        deckAdd.style.zIndex = "2";
        deckAdd.style.cursor = "pointer";

        deckMin.style.position = "absolute";
        deckMin.style.top = "60px";       // Distance from top
        deckMin.style.right = "-12px";     // Distance from right
        deckMin.style.width = "50px";    // Adjust size as needed
        deckMin.style.height = "50px";
        deckMin.style.zIndex = "2";
        deckMin.style.cursor = "pointer";

        const deckCount = document.createElement("p");
        deckCount.textContent = "0";
        deckCount.id = `deckCount-${card.Id}`;
        

        deckCount.style.font = "Arial, sans-serif";
        deckCount.style.fontSize = "20px";
        
        deckCount.style.position = "absolute"; 
        deckCount.style.right = "-7px";        
        deckCount.style.top = "100px";          
        deckCount.style.zIndex = "2";
        deckCount.style.fontFamily = "Arial, sans-serif";
        deckCount.style.fontSize = "30px";
        deckCount.style.margin = "0";
        deckCount.style.color = "#FFFFFF";

        deckCount.style.backgroundColor = "#000000"; // For better visibility
        deckCount.style.border = ".1px solid rgb(0, 0, 0)"; // Proper border value
        deckCount.style.borderRadius = "20%"; // Optional: makes the border circular (like a badge)
        deckCount.style.padding = "5px 10px"; // Adds space inside the border
        deckCount.style.textAlign = "center"; // Centers the text inside the border

        

        // Card text
        const cardLink = document.createElement("a");
        cardLink.href = `${card.href}`;
        cardLink.target = "_blank";


        
        
        const cardText = document.createElement("p");
        cardText.textContent = `${card.name} - ${card.Type} - ${card.Attributes} - ${card.Affiliations}`;
 
        // Card image
        const img = document.createElement("img");
        img.src = card.image; // Use img.src to set the image
        img.alt = `${card.name} image`; // Add alt text for accessibility


        cardContainer.appendChild(deckCount);
        cardContainer.appendChild(deckAdd);
        cardContainer.appendChild(deckMin);
        cardLink.appendChild(img);


        // Checks to see if the image is clicked //
        cardLink.addEventListener("click", function (event) {
            event.preventDefault();  // Prevent the default link behavior
            openCardPage(card);  // Call the function to open the new page
        });

        deckAdd.addEventListener("click", function (event) {
            addToDeck(card);  // Call the function to add card to deck
        });
        deckMin.addEventListener("click", function (event) {
            subtractFromDeck(card);  // Call the function to add card to deck
        });
        

        cardContainer.appendChild(cardLink);

        // Append the card container to the results container
        resultsContainer.appendChild(cardContainer);
    });
}




// Deck Saving //


let deck = {
    cards: {}
};

function saveDeck() {
    let name = prompt("Enter Deck Name: ").trim();
    if (!name) {
        alert("Please enter a deck name.");
        return;
    }
    name = name.replace(/[^a-zA-Z0-9_\- ]/g, "_");

    const key = "MS_deckBuilder_" + name;
    // Save to Google's local storage //
    localStorage.setItem(key, JSON.stringify(deck));
    alert(`Deck "${name}" saved!`);
    updateDeckDisplay();

}

function savedDecksUpdate() {
    let name = localStorage(key);
    
    const deckContainer = document.getElementbyId("div");

}

function addToDeck(card) {
    const totalCount = Object.values(deck.cards).reduce((sum, cardObj) => sum + cardObj.count, 0);
    let hasLeader = false;

    // Check for leader card and total card count restrictions
    for (let id in deck.cards) {

        if (deck.cards[id].Type === "Leader") {
            hasLeader = true;
        }
    }

    if (totalCount === 50 && card.Type === "Leader" && hasLeader === false) {
    }
    else if (totalCount === 50 && hasLeader === false) {
        alert("You need one leader per deck!");
        return;
    } else if (totalCount === 51) {
        alert(`Maximum amount of cards has been added to deck! Please remove some cards to continue.`);
        return;
    }

    if (card.Type === "Leader") {
        for (let id in deck.cards) {
            if (deck.cards[id].Type === "Leader") {
                alert(`You may only have one leader per deck!`);
                return;
            }
        }
    }

    // Adding or updating the card in the deck
    if (!deck.cards[card.Id]) {
        deck.cards[card.Id] = {
            count: 1,
            name: card.name,
            image: card.image,
            Id: card.Id,
            Type: card.Type,
            Color: card.Color,
            Power: card.Power,
            Affiliations: card.Affiliations,
            Attributes: card.Attributes,
            Artist: card.Artist,
            Text: card.Text,
            Trigger: card.Trigger,
            Cost: card.Cost,
            Counter: card.Counter,
            Price: card.Price
        };
    } else {
        if (deck.cards[card.Id].count === 4 && card.Id != "OP01-075" && card.Id != "OP08-072") {
            alert("Maximum amount of cards added to deck!");
        }
        else {
            deck.cards[card.Id].count++;
        }
    }
    const countDisplay = document.getElementById(`deckCount-${card.Id}`);
    if (countDisplay) {
        countDisplay.textContent = deck.cards[card.Id].count;
    }
    updateDeckDisplay();
}
function subtractFromDeck(card) {
    if (!deck.cards[card.Id]) {
        alert("This card is not in the deck!");
        return;
    }

    if (deck.cards[card.Id].count > 1) {
        deck.cards[card.Id].count--;
    } else {
        // count is 1, so remove the card entirely
        delete deck.cards[card.Id];
    }

    // Update the count display or show zero if removed
    const countDisplay = document.getElementById(`deckCount-${card.Id}`);
    if (countDisplay) {
        if (deck.cards[card.Id]) {
            countDisplay.textContent = deck.cards[card.Id].count;
        } else {
            countDisplay.textContent = "0";
        }
    }

    updateDeckDisplay();
}

function updateDeckDisplay() {
    const deckList = document.getElementById('deckList');
    deckList.innerHTML = '';
    
    let hasCards = false;
    let totalCount = 0;

    for (let id in deck.cards) {
        const card = deck.cards[id];
        hasCards = true;
        totalCount += card.count;

        const li = document.createElement('li');
        li.style.marginBottom = '12px';

        const img = document.createElement('img');
        img.src = card.image;
        img.style.width = '50px';
        img.style.height = '75px';

        const text = document.createElement('p');
        text.textContent = `${card.name} - ${card.Id} - (x${card.count})`;

        li.appendChild(img);
        li.appendChild(text);
        deckList.appendChild(li);
    }

    if (!hasCards) {
        deckList.innerHTML = '<li style="color: #ccc">No cards are currently in deck</li>';
    }

    totalCountDisplay.textContent = `Total: ${totalCount}`;
}


// Open new card page on click //


function openCardPage(card) { 
    const newWindow = window.open('', '_blank');
    const doc = newWindow.document;

    const img = doc.createElement("img")
    img.src = card.image;
    img.style.width = '300px';
    img.style.length = '450px';
    
    const header = doc.createElement("h1");
    header.textContent = card.name;

    const type = doc.createElement("p");
    type.textContent = `Card Type: ${card.Type}`;
    // - ${card.Attributes} - ${card.Affiliations} - Cost: ${card.Cost}`;
    const attributes = doc.createElement("p");
    attributes.textContent = `Attribute: ${card.Attributes}`;
    const cost = doc.createElement("p");
    cost.textContent = `Cost: ${card.Cost}`;
    const power = doc.createElement("p");
    power.textContent = `Power: ${card.Power}`;
    const color = doc.createElement("p");
    color.textContent = `Color: ${card.Color}`;
    const affiliations = doc.createElement("p");
    affiliations.textContent = `Affiliations: ${card.Affiliations}`;
    const id = doc.createElement("p");
    id.textContent = `Card ID: ${card.Id}`;
    const text = doc.createElement("p");
    text.textContent = `Card Text: ${card.Text}`;
    const counter = doc.createElement("p");
    counter.textContent = `Counter: ${card.Counter}`;
    const trigger = doc.createElement("p");
    trigger.textContent = `Trigger: ${card.Trigger}`;
    const artist = doc.createElement("p");
    artist.textContent = `Artist: ${card.Artist}`;
    const price = doc.createElement("p");
    price.textContent = `Price: ${card.Price}`;

    // Append the elements to the new window's body
    doc.body.appendChild(img);
    doc.body.appendChild(header);
    doc.body.appendChild(type);
    doc.body.appendChild(color);
    doc.body.appendChild(cost);
    doc.body.appendChild(power);
    doc.body.appendChild(counter);
    doc.body.appendChild(text);
    doc.body.appendChild(affiliations);
    doc.body.appendChild(id);
    doc.body.appendChild(attributes);
    doc.body.appendChild(trigger);
    doc.body.appendChild(price);
    doc.body.appendChild(artist);

    // Optionally, you can also add some styling to the new page
    doc.body.style.fontFamily = 'Arial, sans-serif';
    doc.body.style.margin = '20px';
}

// Call the fetchCards function to start the process
fetchCards();