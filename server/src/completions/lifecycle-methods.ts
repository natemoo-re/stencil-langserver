export const LIFECYCLE_METHODS: any[] = [
    {
        label: 'componentWillLoad',
        id: 200,
        description: [
            "The component is about to load and it has not rendered yet.\n",
            "This is the best place to make any data updates before the first render.\n",
            "`componentWillLoad` will only be called once."
        ],
        body: [
            "componentWillLoad() {",
            "\t${1:console.log('Component is about to be rendered');}$0",
            "}"
        ]
    },
    {
        label: 'componentDidLoad',
        id: 201,
        description: [
            "The component has loaded and has already rendered.\n",
            "Updating data in this method will cause the component to re-render.\n",
            "`componentDidLoad` will only be called once."
        ],
        body: [
            "componentDidLoad() {",
            "\t${1:console.log('Component has been rendered');}$0",
            "}"
        ]
    },
    {
        label: 'componentWillUpdate',
        id: 202,
        description: [
            "The component is about to update and re-render.\n",
            "Called multiple times throughout the life of the component as it updates.\n",
            "`componentWillUpdate` is not called on the first render."
        ],
        body: [
            "componentWillUpdate() {",
            "\t${1:console.log('Component will update and re-render');}$0",
            "}"
        ]
    },
    {
        label: 'componentDidUpdate',
        id: 203,
        description: [
            "The component has updated and re-rendered.\n",
            "Called multiple times throughout the life of the component as it updates.\n",
            "`componentDidUpdate` is not called on the first render."
        ],
        body: [
            "componentDidUpdate() {",
            "\t${1:console.log('Component did update');}$0",
            "}"
        ]
    },
    {
        label: 'componentDidUnload',
        id: 204,
        description: "The component did unload and the element will be destroyed.",
        body: [
            "componentDidUnload() {",
            "\t${1:console.log('Component removed from the DOM');}$0",
            "}"
        ]
    }
]