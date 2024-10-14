/*
API for Collaborative Optimization
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';
import cssParser from 'css';
import * as esprima from 'esprima';
import * as estraverse from 'estraverse';
import * as escodegen from 'escodegen';
import { Program, FunctionDeclaration, Node, Statement, ExpressionStatement } from 'estree';


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { html, updateHtml } = req.body;
      if (typeof html !== 'string' || typeof updateHtml !== 'string') {
        throw new Error('Invalid input');
      }

      // console.log("UPDATE HTML:", updateHtml);

      const dom = new JSDOM(html);
      const document = dom.window.document;

      const updateDom = new JSDOM(updateHtml);
      const updateDocument = updateDom.window.document;

      /* CSS */
      // Get the content of the <style> element
      const getStyleContent = (doc: Document) => {
        const modifyStyles = doc.querySelectorAll('style[data-opt="modify"]');
        modifyStyles.forEach((modifyStyle) => {
          modifyStyle.removeAttribute('data-opt');
        });

        let styleContent = '';
        const styleElements = doc.querySelectorAll('style');

        styleElements.forEach((styleElement) => {
          styleContent += styleElement.textContent + '\n';
        });

        return styleContent;
      };

      // Parsing CSS styles, converting to AST
      const parseStyles = (styles: string) => {
        return cssParser.parse(styles);
      };

      // Updating the original CSS
      const updateOriginalStyles = (
        originalAst: cssParser.Stylesheet,
        updateAst: cssParser.Stylesheet
      ): cssParser.Stylesheet => {
        const originalRules = originalAst.stylesheet?.rules || [];
        const updateRules = updateAst.stylesheet?.rules || [];

        const generateRuleKey = (rule: cssParser.Rule | cssParser.AtRule): string => {
          if (rule.type === 'rule') {
            // For normal rules, use the selector directly as a key value
            const selectors = (rule as cssParser.Rule).selectors || [];
            return selectors.join(',');
          } else {
            // For @ rules, handle each type
            switch (rule.type) {
              case 'media':
                const mediaRule = rule as cssParser.Media;
                return `@media ${mediaRule.media || ''}`;
              case 'keyframes':
                const keyframesRule = rule as cssParser.KeyFrames;
                return `@keyframes ${keyframesRule.name || ''}`;
              case 'font-face':
                return '@font-face';
              case 'charset':
                const charsetRule = rule as cssParser.Charset;
                return `@charset ${charsetRule.charset || ''}`;
              case 'import':
                const importRule = rule as cssParser.Import;
                return `@import ${importRule.import || ''}`;
              case 'supports':
                const supportsRule = rule as cssParser.Supports;
                return `@supports ${supportsRule.supports || ''}`;
              default:
                return `@${rule.type}`;
            }
          }
        };

        // Update Style
        const updateRulesRecursive = (
          originalRules: cssParser.Rule[],
          updateRules: cssParser.Rule[]
        ) => {
          // Create a new mapping at the current hierarchy
          const originalRuleMap = new Map<string, cssParser.Rule | cssParser.AtRule>();

          // Populate the mapping with the original rules of the current hierarchy
          originalRules.forEach((rule) => {
            const key = generateRuleKey(rule);
            if (key) {
              originalRuleMap.set(key, rule);
            }
          });

          // Traversal update rules
          updateRules.forEach((updateRule) => {
            const key = generateRuleKey(updateRule);

            if (originalRuleMap.has(key)) {
              const originalRule = originalRuleMap.get(key)!;
              const index = originalRules.indexOf(originalRule);

              if ('rules' in originalRule && 'rules' in updateRule) {
                // If both sides have nested rules, recursively update the
                updateRulesRecursive(
                  (originalRule as any).rules,
                  (updateRule as any).rules
                );
              } else {
                // Replace the entire rule
                originalRules[index] = updateRule;
              }
            } else {
              // Add new rule
              originalRules.push(updateRule);
            }
          });
        };

        // Start recursive update
        updateRulesRecursive(originalRules, updateRules);

        // Returns the updated AST
        originalAst.stylesheet!.rules = originalRules;
        return originalAst;
      };

      // Getting Styles
      const originalStyles = getStyleContent(document);
      const updateStyles = getStyleContent(updateDocument);

      // Parsing and updating when updateStyles are not empty
      if (updateStyles.trim() !== '') {
        let updatedStyles = updateStyles;

        // Parsing and updating when originalStyles are not empty
        if (originalStyles.trim() !== '') {
          const originalStyleAst = parseStyles(originalStyles);
          const updateStyleAst = parseStyles(updateStyles);

          const updatedStyleAst = updateOriginalStyles(originalStyleAst, updateStyleAst);

          // Converting the updated AST back to a CSS string
          updatedStyles = cssParser.stringify(updatedStyleAst);
        }

        // Update the <style> element of the original document
        let styleElement = document.querySelector('style');
        if (styleElement) {
          styleElement.textContent = updatedStyles;
        } else {
          // If no <style> element exists, create one
          const newStyleElement = document.createElement('style');
          newStyleElement.textContent = updatedStyles;
          document.head.appendChild(newStyleElement);
        }
      }
      
      /* JS */
      const removeScriptDataOpt = (document: Document) => {
        const modifyScripts = document.querySelectorAll('script[data-opt="modify"]');
        modifyScripts.forEach((scriptElement) => {
          scriptElement.removeAttribute('data-opt');
        });
      };

      removeScriptDataOpt(updateDocument);

      // Get the contents of the <script> elements
      const originalScripts = Array.from(document.querySelectorAll('script')).find(script => script.getAttribute('data-custom-scripts') === 'true')?.textContent || '';
      const updateScripts = updateDocument.querySelector('script')?.textContent || '';

      // Parses the original and updated scripts as ASTs
      const originalScriptAst = esprima.parseScript(originalScripts);
      const updateScriptAst = esprima.parseScript(updateScripts);

      // Detects getElementById calls and adds the data-id attribute to the corresponding HTML element
      const detectAndAssignDataId = (ast: Program, document: Document) => {
        estraverse.traverse(ast, {
          enter(node: Node) {
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              node.callee.object.type === 'Identifier' &&
              node.callee.object.name === 'document' &&
              node.callee.property.type === 'Identifier' &&
              node.callee.property.name === 'getElementById' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal' &&
              typeof node.arguments[0].value === 'string'
            ) {
              const elementId = node.arguments[0].value;
              const element = document.getElementById(elementId);

              if (element) {
                // Get or set data-id
                let dataId = element.getAttribute('data-id');
                if (!dataId) {
                  dataId = elementId;
                  element.setAttribute('data-id', dataId);
                }

                // Updating parameter values and raw values in ASTs
                node.arguments[0].value = dataId;
                node.arguments[0].raw = JSON.stringify(dataId);
              }
            }
          }
        });
      };
      detectAndAssignDataId(updateScriptAst, document);

      // Create a mapping of function declarations (function name -> function declaration node)
      const getFunctionDeclarations = (ast: Program) => {
        const functionsMap = new Map<string, FunctionDeclaration>();
        estraverse.traverse(ast, {
          enter(node: Node) {
            if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
              functionsMap.set(node.id.name, node);
            }
          }
        });
        return functionsMap;
      };

      // Get original and updated function mappings
      const originalFunctions = getFunctionDeclarations(originalScriptAst);
      const updateFunctions = getFunctionDeclarations(updateScriptAst);

      // Handling Function Deletion Logic
      const getFunctionsAssignedNull = (ast: Program): Set<string> => {
        const functionsToDelete = new Set<string>();
        estraverse.traverse(ast, {
          enter(node: Node) {
            if (
              node.type === 'ExpressionStatement' &&
              node.expression.type === 'AssignmentExpression' &&
              node.expression.operator === '=' &&
              node.expression.left.type === 'Identifier' &&
              node.expression.right.type === 'Literal' &&
              node.expression.right.value === null
            ) {
              const functionName = node.expression.left.name;
              functionsToDelete.add(functionName);
            }
          }
        });
        return functionsToDelete;
      };

      const removeImmediateInvocations = (ast: Program, functionsToRemove: Set<string>) => {
        estraverse.replace(ast, {
          enter(node: Node, parent: Node | null) {
            if (
              node.type === 'ExpressionStatement' &&
              node.expression.type === 'CallExpression' &&
              node.expression.callee.type === 'Identifier' &&
              functionsToRemove.has(node.expression.callee.name)
            ) {
              // Remove the current node from the body of the parent node
              if (parent && 'body' in parent && Array.isArray(parent.body)) {
                const index = parent.body.indexOf(node as any);
                if (index > -1) {
                  parent.body.splice(index, 1);
                }
              }
              // Remove current node
              return estraverse.VisitorOption.Remove;
            }
          }
        });
      };

      const removeNullAssignments = (ast: Program) => {
        estraverse.replace(ast, {
          enter(node: Node, parent: Node | null) {
            if (
              node.type === 'ExpressionStatement' &&
              node.expression.type === 'AssignmentExpression' &&
              node.expression.operator === '=' &&
              node.expression.left.type === 'Identifier' &&
              node.expression.right.type === 'Literal' &&
              node.expression.right.value === null
            ) {
              if (parent && 'body' in parent && Array.isArray(parent.body)) {
                const index = parent.body.indexOf(node as any);
                if (index > -1) {
                  parent.body.splice(index, 1);
                }
              }
              return estraverse.VisitorOption.Remove;
            }
          }
        });
      };

      // Detecting functions assigned to null
      const functionsAssignedNull = getFunctionsAssignedNull(updateScriptAst);
      // Remove functions assigned to null
      functionsAssignedNull.forEach((funcName) => {
        originalFunctions.delete(funcName);
      });
      // Remove immediate calls to assigned functions
      removeImmediateInvocations(originalScriptAst, functionsAssignedNull);
      // Remove the null assignment statement from a function
      removeNullAssignments(updateScriptAst);

      // Handling function add and replace logic
      updateFunctions.forEach((funcNode, funcName) => {
        originalFunctions.set(funcName, funcNode);
      });

      // Functions that handle Immediate prefixes
      const immediateCalls: Statement[] = [];
      // Find all functions that begin with “Immediate” and generate immediate call statements
      originalFunctions.forEach((funcNode, funcName) => {
        if (funcName.startsWith('Immediate')) {
          const callExpression: ExpressionStatement = {
            type: 'ExpressionStatement',
            expression: {
              type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: funcName
              },
              arguments: [],
              optional: false
            }
          };
          immediateCalls.push(callExpression);
        }
      });

      // Re-generate the updated script AST
      const updatedScriptAst: Program = {
        type: 'Program',
        body: [
          // Add all function declarations
          ...Array.from(originalFunctions.values()),
          // Adding Immediate Called Functions
          ...immediateCalls
        ],
        sourceType: 'script'
      };

      // Convert the updated AST to a code string
      const updatedScripts = escodegen.generate(updatedScriptAst);

      // Update the <script> element of the original document
      let scriptElement = document.querySelector('script[data-custom-scripts]');
      if (scriptElement) {
        scriptElement.textContent = updatedScripts;
      } else {
        const newScriptElement = document.createElement('script');
        newScriptElement.setAttribute('data-custom-scripts', 'true');
        newScriptElement.textContent = updatedScripts;
        document.body.appendChild(newScriptElement);
      }

      /* HTML*/
      // Deletion: find all elements with data-opt=“delete”
      const deleteElements = updateDocument.querySelectorAll('[data-opt="delete"]');
      deleteElements.forEach((element) => {
        const id = element.id;
        const elementToDelete = document.querySelector(`#${id}`);
        if (elementToDelete) {
          elementToDelete.remove();
        }
      });

      // Modification: find all elements with data-opt="modify”
      const modifyElements = updateDocument.querySelectorAll('[data-opt="modify"]');
      modifyElements.forEach((updateElement) => {
        const id = updateElement.id;
        const originalElement = document.querySelector(`#${id}`);
        if (originalElement) {
          Array.from(updateElement.attributes).forEach(attr => {
            if (attr.name !== 'id' && attr.name !== 'data-opt') {
              originalElement.setAttribute(attr.name, attr.value);
            }
          });
          // Determine if text content needs to be updated
          if (updateElement.children.length === 0) {
            originalElement.textContent = updateElement.textContent;
          }
        }
      });

      // Addition: find all elements with data-opt="add”
      const addElements = updateDocument.querySelectorAll('[data-opt="add"]');
      addElements.forEach((element) => {
        const idParts = element.id.split('_');
        const parentId = idParts[1];
        const nextId = idParts[3] === 'null' ? null : idParts[3];
        const queueNumber = parseInt(idParts[5], 10);

        // Find the parent element in the original document
        const parentElement = document.getElementById(parentId);
        if (parentElement) {
          // Remove the data-opt attribute before inserting the element
          element.removeAttribute("data-opt");
          // If nextId is null, then the element should be added to the end of the parent element
          if (nextId === null) {
            parentElement.appendChild(element);
          } else {
            // Find the element before the new element should be inserted
            const nextElement = document.getElementById(nextId);
            if (nextElement) {
              parentElement.insertBefore(element, nextElement);
            } else {
              // If the specified next element is not found, the new element is also added to the end of the parent element
              parentElement.appendChild(element);
            }
          }
        }
      });

      // Remove the ID attribute from all elements
      const allElements = document.querySelectorAll("*");
      allElements.forEach(element => {
        element.removeAttribute("id");
      });

      // Assign data-ID to ID
      const restoreIdFromDataId = (document: Document) => {
        const allElements = document.querySelectorAll("[data-id]");
        allElements.forEach(element => {
          const dataId = element.getAttribute('data-id');
          if (dataId) {
            element.setAttribute('id', dataId);
          }
        });
      };
      restoreIdFromDataId(document);

      const modifyHtml = dom.serialize();

      res.status(200).json({ modifyHtml });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to process HTML', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}