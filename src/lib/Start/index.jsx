/* StartBar */
import css from './index.module.css';
import { useState } from 'react';
import { default as reactLogo }  from './public/ReactLogo.svg';

export function Bar({children, className = '', style = {}, ...props}){
  const {
    position = 'bottom' // 'top'
  } = props;

  const positionSetter = (position) => {
    switch(position) {
      case 'bottom': return css.placeBarBot;
      case 'top': return css.placeBarTop;
      default:
        return css.placeBarBot;
    }
  }
  return (
    <div 
      className={`${css.master} ${positionSetter(position)} ${className}`}
      style={{
        // zIndex: 2147483647, //max css z-index value allowed
        ...style
      }}
    >
      {children}
    </div>
  )
}
  
export function Menu({children, className = '', style = {}, ...props}){
  const {
    logo = <img src={reactLogo} />,
    className_startButton = '',
    className_startButton_isMenuOpened_true = css.startButton_isMenuOpened_true
  } = props;

  const [isMenuOpened, setIsMenuOpened] = useState(false);
  return (<>
    {isMenuOpened
      ? <div
          className={css.menu}
        >
          {children}
        </div>
      : null
    }
    <div
      className={css.left}
    >
      <button
        className={`${css.startButton} ${isMenuOpened? className_startButton_isMenuOpened_true : ''} ${className_startButton}`}
        onClick={()=>{
          setIsMenuOpened(!isMenuOpened)
        }}
        onBlur={()=>{
          setIsMenuOpened(false)
        }}
      >
        {logo}
      </button>
    </div>
  </>)
}
  
export function Icons({children, className = '', style = {}, ...props}){
  return (
    <div
      className={`${css.mid_0} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
export function Windows({children, className = '', style = {}, ...props}){
    return (
        <div
          className={`${css.mid_1} ${className}`}
          style={style}
        >
          {children}
        </div>
    )
}
export function Footer({children, className = '', style = {}, ...props}){
    return(
        <div
          className={`${css.right} ${className}`}
          style={style}
        >
          {children}
        </div>
    )
}

function Minimised({style,className,onClick,children,...props}){
  return(
    <button
      onClick={onClick}
      className={`${css['Windows-Minimised']} ${className}`}
      style={style}
    >
        {children}
    </button>
  )
}
Windows.Minimised = Minimised;