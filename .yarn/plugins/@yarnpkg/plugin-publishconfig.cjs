/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-publishconfig",
factory: function (require) {
var plugin=(()=>{var l=Object.defineProperty;var s=(p,o)=>{for(var r in o)l(p,r,{get:o[r],enumerable:!0})};var d={};s(d,{beforeWorkspacePacking:()=>a,default:()=>g});function f(p,o,r){o.split&&(o=o.split("."));for(var e=0,t=o.length,i=p,c,n;e<t&&(n=o[e++],!(n==="__proto__"||n==="constructor"||n==="prototype"));)i=i[n]=e===t?r:typeof(c=i[n])==typeof o?c:o[e]*0!=0||!!~(""+o[e]).indexOf(".")?{}:[]}function a(p,o){let r=o.publishConfig;if(r){let e=Object.entries(r).filter(([t])=>t.startsWith("$")).map(([t,i])=>[t.replace(/^\$/,""),i]);for(let[t,i]of e)f(o,t,i)}}var u={hooks:{beforeWorkspacePacking:a}},g=u;return d;})();
return plugin;
}
};
