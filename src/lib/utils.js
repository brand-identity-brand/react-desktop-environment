export function htmlToElement(html) {
    const template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

export const styles = ( ...className) => [ ...className].reduce( ( accum, className ) => `${accum} ${className}`, '' );
