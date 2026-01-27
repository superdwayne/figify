---
type: quick
plan: 001
autonomous: true
files_modified:
  - src/main/generator/index.ts
  - src/main/shadcn/componentFactory.ts
---

<objective>
Fix Shadcn component conversion to work properly for components with children.

Purpose: Currently, Buttons, Cards, Badges, and Inputs that have children skip the
Shadcn factory entirely because of the `!hasChildren` condition at line 617 in
`index.ts`. This causes these components to fall through to generic styling,
losing their Shadcn variant styling (colors, borders, shadows, padding).

Output: Shadcn components receive proper variant styling regardless of whether
they have children, and children are correctly processed inside the styled container.
</objective>

<context>
@src/main/generator/index.ts
@src/main/shadcn/componentFactory.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Modify createElement to use Shadcn factory for components with children</name>
  <files>src/main/generator/index.ts</files>
  <action>
At line 617, the condition `if (hasShadcnSpec && !hasChildren)` prevents Shadcn
components with children from getting proper styling. Fix this by:

1. Change the condition from `if (hasShadcnSpec && !hasChildren)` to just
   `if (hasShadcnSpec)` - remove the `!hasChildren` check entirely

2. The Shadcn factory's `createComponent` method returns a styled FrameNode.
   Currently the code does `return await this.shadcnFactory.createComponent(...)`,
   which means children never get processed.

3. Instead of returning immediately, capture the created node:
   ```typescript
   if (hasShadcnSpec) {
     const enhancedElement = this.enhanceElementWithVariant(element);
     const shadcnNode = await this.shadcnFactory.createComponent(enhancedElement, parent, parentBounds);

     // If no children, we're done
     if (!hasChildren) {
       return shadcnNode;
     }

     // For components with children, the Shadcn node becomes the container
     // Children will be processed by processElementWithChildren which calls
     // createElement for each child with this node as parent
     return shadcnNode;
   }
   ```

4. The key insight: `processElementWithChildren` at line 393-402 already handles
   recursively processing children. It checks `if (children.length > 0 && node.type === 'FRAME')`
   and then processes each child with the current node as parent. So we just need
   to return the styled Shadcn node and let the existing recursion handle children.

Note: The Shadcn factory's createFrameNode method already calls `parent.appendChild(frame)`
at line 151 of componentFactory.ts, so the node is correctly added to the parent.
  </action>
  <verify>
TypeScript compiles without errors:
```bash
cd /Users/dwayne/Figma-plugin && npm run build
```
  </verify>
  <done>
The `hasShadcnSpec` condition no longer excludes components with children. Components
like Button, Card, Badge, and Input with children now go through the Shadcn factory
to get proper variant styling before their children are processed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Handle text content for Shadcn components with children</name>
  <files>src/main/generator/index.ts</files>
  <action>
There's a subtle issue: Shadcn components like Button often have text content
(element.content) AND children (element.children might list the text as a child).
The current generic frame path at lines 682-712 handles adding text content to
frames without children.

For Shadcn components with text content (like a Button with label "Submit"):

1. After the Shadcn factory creates the styled container, check if the element
   has text content AND no real children:
   ```typescript
   if (hasShadcnSpec) {
     const enhancedElement = this.enhanceElementWithVariant(element);
     const shadcnNode = await this.shadcnFactory.createComponent(enhancedElement, parent, parentBounds);

     // Add text content if present and this is a leaf component (no actual children)
     // The hasChildren flag is based on element.children array, which for simple
     // buttons/badges should be empty or only contain text references
     const hasTextContent = element.content && element.content.trim().length > 0;

     if (hasTextContent && !hasChildren && shadcnNode.type === 'FRAME') {
       const textNode = this.nodeFactory.createText({
         name: `${this.generateSemanticName(element)}-text`,
         content: element.content!,
         bounds: {
           x: 0,
           y: 0,
           width: element.bounds.width,
           height: element.bounds.height,
         },
         styles: element.styles,
       });
       await this.styleApplier.applyTextStyles(textNode, element.styles);
       (shadcnNode as FrameNode).appendChild(textNode);
     }

     return shadcnNode;
   }
   ```

2. This ensures:
   - Button("Submit") with no children: gets Shadcn styling + text node inside
   - Card with children: gets Shadcn styling, children processed recursively
   - Badge("New") with no children: gets Shadcn styling + text node inside
  </action>
  <verify>
TypeScript compiles without errors:
```bash
cd /Users/dwayne/Figma-plugin && npm run build
```
  </verify>
  <done>
Shadcn components with text content (but no children) correctly have their text
rendered inside the styled container, matching the previous behavior for generic
frames.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `npm run build` completes without errors
2. Code inspection: The condition at ~line 617 no longer has `!hasChildren`
3. Flow verification: Trace through the code mentally:
   - Button with hasShadcnSpec=true, hasChildren=false -> Shadcn factory + text
   - Card with hasShadcnSpec=true, hasChildren=true -> Shadcn factory, then processElementWithChildren handles children
</verification>

<success_criteria>
- [ ] Build passes without TypeScript errors
- [ ] The `!hasChildren` check is removed from the Shadcn component condition
- [ ] Text content is properly added to leaf Shadcn components
- [ ] Components with children still work (children processed after Shadcn styling applied)
</success_criteria>
