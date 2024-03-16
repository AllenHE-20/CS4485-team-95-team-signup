function prefFormLog() {
    
}

function populateUserList(pageNum) {
    var sampleData = [
  {
      "name": "John Doe",
      "profileLink": "https://example.com/john-doe"
  },
  {
      "name": "Jane Smith", 
      "profileLink": "https://example.com/jane-smith"
  },
  {
      "name": "Michael Johnson", 
      "profileLink": "https://example.com/michael-johnson"
  },
  {
      "name": "Emily Williams", 
      "profileLink": "https://example.com/emily-williams"
  },
  {
      "name": "David Brown",
      "profileLink": "https://example.com/david-brown"
  },
  {
      "name": "Sarah Davis", 
      "profileLink": "https://example.com/sarah-davis"
  },
  {
      "name": "Christopher Miller", 
      "profileLink": "https://example.com/christopher-miller"
  },
  {
      "name": "Jessica Wilson", 
      "profileLink": "https://example.com/jessica-wilson"
  },
  {
      "name": "Matthew Moore", 
      "profileLink": "https://example.com/matthew-moore"
  },
  {
      "name": "Ashley Taylor", 
      "profileLink": "https://example.com/ashley-taylor"
  },
  {
      "name": "Joshua Anderson", 
      "profileLink": "https://example.com/joshua-anderson"
  },
  {
      "name": "Amanda Thomas",
      "profileLink": "https://example.com/amanda-thomas"
  },
  {
      "name": "Daniel Jackson", 
      "profileLink": "https://example.com/daniel-jackson"
  },
  {
      "name": "Brittany White", 
      "profileLink": "https://example.com/brittany-white"
  },
  {
      "name": "Joseph Harris",
      "profileLink": "https://example.com/joseph-harris"},
  {
      "name": "Courtney Martin", 
      "profileLink": "https://example.com/courtney-martin"
  },
  {
      "name": "Andrew Thompson", 
      "profileLink": "https://example.com/andrew-thompson"
  },
  {
      "name": "Lauren Garcia", 
      "profileLink": "https://example.com/lauren-garcia"
  },
  {
      "name": "William Martinez", 
      "profileLink": "https://example.com/william-martinez"
  },
  {
      "name": "Morgan Robinson", 
      "profileLink": "https://example.com/morgan-robinson"
  },
  {
      "name": "Ryan Clark", 
      "profileLink": "https://example.com/ryan-clark"
  },
  {
      "name": "Megan Rodriguez", 
      "profileLink": "https://example.com/megan-rodriguez"
  },
  {
      "name": "Jacob Lewis", 
      "profileLink": "https://example.com/jacob-lewis"
  },
  {
      "name": "Kimberly Lee", 
      "profileLink": "https://example.com/kimberly-lee"
  },
  {
      "name": "Michael Walker", 
      "profileLink": "https://example.com/michael-walker"
  },
 
];
    
    //These values indicate the range of student listings that the API will return.
    //const startOfRange = (pageNum - 1) * 50;
    //const endOfRange = (pageNum * 50) - 1;
    //TODO: Replace the constant data with an API call and formula-determined range bounds
    const startOfRange = 0;
    const endOfRange = 24;
    
    //TODO: Add a way to know or get the current number of people participating, and what page you are currently on.
    const desList = document.getElementById("listBody");
    
    for(var curIndex=startOfRange; curIndex <= endOfRange; curIndex++) {
        //This loop adds all students in the range to the list on the page
        var tempNewListItem = document.createElement("li");
        var tempNewLinkItem = document.createElement("a");
        tempNewLinkItem.textContent = sampleData[curIndex].name;
        tempNewLinkItem.setAttribute('href', sampleData[curIndex].profileLink);
        tempNewListItem.appendChild(tempNewLinkItem);
        desList.appendChild(tempNewListItem);
    }
    
    console.log("Function run!");
}