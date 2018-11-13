export interface Snippet {
    label: string;
    id: number;
    description: string | string[];
    body: string | string[];
    preview?: string | string[];
    autoImport?: string;
    title?: string;
}

export const DECORATORS: Snippet[] = [
    {
        label: 'Prop',
        id: 100,
        description: 'The `@Prop()` decorator exposes custom attribute/properties publicly on the element, so that developers can provide values to the component.',
        body: "@Prop() ${1:propName}: ${2|any,string,boolean,number|};",
        preview: "@Prop() propName: any;",
        autoImport: 'Prop'
    },
    {
        label: 'Watch',
        id: 101,
        description: "When a user updates a property, `@Watch()` will fire what ever method it's attached to and pass that methd the new value of the prop along with the old value.",
        body: [
            "@Watch('${1{{computedProps}}}')",
            "${1}Changed() {",
            "\t${2:console.log('$1 changed to ', this.$1);}$0",
            "}"
        ],
        preview: [
            "@Watch('propName')",
            "propNameChanged() {",
            "\tconst { propName } = this;",
            "\tconsole.log('propName changed to ', propName);",
            "}"
        ],
        autoImport: 'Watch'
    },
    {
        label: 'State',
        id: 102,
        description: "The `@State()` decorator can be used to manage internal data for a component. Any changes to a `@State()` property will cause the components render function to be called again.",
        body: "@State() ${1:stateName}: ${2|any,string,boolean,number|};",
        preview: "@State() stateName: any",
        autoImport: 'State'
    },
    {
        label: 'Method',
        id: 103,
        description: "The `@Method()` decorator is used to expose methods on the public API. Functions decorated with the `@Method()` decorator can be called directly from the element.",
        body: [
            "@Method()",
            "${1:methodName}($2) {",
            "\t$0",
            "}"
        ],
        preview: [
            "@Method()",
            "methodName() {",
            "\t",
            "}"
        ],
        autoImport: 'Method'
    },
    {
        label: 'Element',
        id: 104,
        description: "The `@Element()` decorator is how to get access to the host element within the class instance. This returns an instance of `HTMLElement`, so standard DOM methods/events can be used here.",
        body: "@Element() ${1:element}: HTMLElement;",
        preview: "@Element() element: HTMLElement;",
        autoImport: 'Element'
    },
    {
        label: 'Event',
        id: 105,
        body: "@Event() ${1:eventName}: EventEmitter<${2:any}>;",
        preview: "@Event() eventName: EventEmitter<any>;",
        description: "The `@Event()` decorator allows a Component to dispatch Custom DOM events for other components to handle.",
        autoImport: 'Event, EventEmitter'
    },
    {
        label: 'Listen',
        id: 106,
        description: "The `Listen()` decorator is for handling events dispatched from @Events.",
        body: [
            "@Listen('${1:eventName}')",
            "protected ${1}Handler(event) {",
            "\t${2:console.log('Received the \"$1\" event: ', event);}$0",
            "}"
        ],
        preview: [
            "@Listen('eventName')",
            "protected eventNameHandler(event) {",
            "\tconsole.log('Received the \"$1\" event: ', event);",
            "}"
        ],
        autoImport: 'Listen'
    }
];