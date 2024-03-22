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

const teamList = {
    yourTeam: 12,
    teams: teams,
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

module.exports.teams = teams;
module.exports.teamList = teamList;
module.exports.invites = invites;
