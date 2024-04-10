const teams = [
    {
        id: 9,
        avatar: "/profile.png",
        interests: [
            "Raytheon Drone Showcase",
            "Team Sign-Up",
            "Dr. Becker Software-Software Project",
        ],
        skills: [
            "Software development",
            "ML programming",
            "C++",
            "Front-end design",
            "Orchestrator",
            "TensorFlow",
        ],
        members: [
            "John Doe",
            "Jane Doe",
        ],
        open: true,
    },
    {
        id: 12,
        avatar: "/profile.png",
        interests: [
            "Team Sign-Up",
            "Dr. Becker Software-Software Project",
            "Raytheon Drone Showcase",
        ],
        skills: [
            "C++",
            "Software development",
            "Front-end design",
            "Orchestrator",
            "ML programming",
            "TensorFlow",
        ],
        members: [
            "Michael Pham",
            "Allen Elledge",
            "Nghia Nguyen",
            "David Wilkinson",
            "Justin Eggers",
        ],
        open: false,
    },
    {
        id: 27,
        avatar: "/profile.png",
        interests: [
            "Dr. Becker Software-Software Project",
            "Raytheon Drone Showcase",
            "Team Sign-Up",
        ],
        skills: [
            "Orchestrator",
            "ML programming",
            "TensorFlow",
            "C++",
            "Software development",
            "Front-end design",
        ],
        members: [
            "Bob Joel",
            "Jimmy James",
            "Timothy Nguyen",
        ],
        open: true,
    },
];

const projects = [
    {
        projectID: 9,
        avatar: "/profile.png",
        title: "Smart City Host Application over Wi-SUN",
        sponsor: "Texas Instruments",
        description: "Join the ECE Team in developing a functional Wi-SUN Host Application on TI MSP 432 communicating over TI CC 13xx",
        skills: [
            "Embedded SW Development",
            "Basic Understanding of wireless networks",
        ],
        team_assigned: true,
    },
    {
        id: 10,
        avatar: "/profile.png",
        title: "AI-ML-Driven RF Pulse Detection",
        sponsor: "L3Harris",
        description: "Join our company in developing a traditional DSP to create spectrograms that visualize signals, and characterize how well ML and MV can identify signals",
        skills: [
            "Basic understanding of AI/ML proramming",
            "Solid understanding of imaginary numbers, sequences, and series",
        ],
        team_assigned: true,
    },
    {
        id: 11,
        avatar: "/profile.png",
        title: "Team-Sign Up!",
        sponsor: "Professor Sridhar Alagar",
        description: "Create a website for future ECS students, utilizing many different skillsets with the potential for its practical use!",
        skills: [
            "Understanding of HTML/CSS",
            "Work with databases, and EJS",
            "ML algorithms",
        ],
        team_assigned: true,
    },
];

const teamList = {
    yourTeam: 12,
    yourProject: 11,
    teams: teams,
    projects: projects,
};

const LOREM_IPSUM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."

const invites = {
    yourTeam: null,
    invites: [
        { team: teams[0], message: LOREM_IPSUM },
        { team: teams[1], message: LOREM_IPSUM },
        { team: teams[2], message: LOREM_IPSUM },
    ],
}

const adminTeam = [    
    {
        id: 9,
        members: [
            "John Doe",
            "Jane Doe",
        ],        
        projectID: null      
    },
    {
        id: 12,
        members: [
            "Michael Pham",
            "Allen Elledge",
            "Nghia Nguyen",
            "David Wilkinson",
            "Justin Eggers",
        ],
        projectID: 11
    }
]

module.exports.teams = teams;
module.exports.teamList = teamList;
module.exports.projects = projects;
module.exports.invites = invites;
module.exports.adminTeam = adminTeam;