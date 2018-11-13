export const METHODS = [
    {
        label: 'hostData',
        id: 300,
        description: 'The `hostData()` method is used to dynamically set host element attributes.',
        body: [
            "hostData() {",
            "\treturn {",
            "\t\t$0",
            "\t}",
            "}"
        ],
        preview: [
            "hostData() {",
            "\treturn {",
            "\t\t",
            "\t}",
            "}"
        ]
    },
    {
        label: 'render',
        id: 301,
        description: 'The `render()` method is required in order to render the component.',
        body: [
            "render() {",
            "\treturn (",
            "\t\t<div>",
            "\t\t\t${1:<p>Hello <code>{{componentTag}}</code></p>}$0",
            "\t\t</div>",
            "\t);",
            "}"
        ],
        preview: [
            "render() {",
            "\treturn (",
            "\t\t<div>",
            "\t\t\t<p>Hello my-component!</p>",
            "\t\t</div>",
            "\t);",
            "}"
        ]
    }
]