import styles from './styles.module.scss';

const BackgroundRays = () => {
  return (
    <div className={`${styles.rayContainer} `}>
      {/* Light rays */}
      <div className={`${styles.lightRay} ${styles.ray1}`}></div>
      <div className={`${styles.lightRay} ${styles.ray2}`}></div>
      <div className={`${styles.lightRay} ${styles.ray3}`}></div>
      <div className={`${styles.lightRay} ${styles.ray4}`}></div>
      <div className={`${styles.lightRay} ${styles.ray5}`}></div>
      <div className={`${styles.lightRay} ${styles.ray6}`}></div>
      <div className={`${styles.lightRay} ${styles.ray7}`}></div>
      <div className={`${styles.lightRay} ${styles.ray8}`}></div>

      {/* Waterflow */}
      <div className={`${styles.waterFlowContainer}`}>
        <div className={`${styles.waterStream} ${styles.stream1}`}></div>
        <div className={`${styles.waterStream} ${styles.stream2}`}></div>
        <div className={`${styles.waterStream} ${styles.stream3}`}></div>
        <div className={`${styles.waterStream} ${styles.stream4}`}></div>
        <div className={`${styles.waterStream} ${styles.stream5}`}></div>

        <div className={`${styles.waterRipple} ${styles.ripple1}`}></div>
        <div className={`${styles.waterRipple} ${styles.ripple2}`}></div>
        <div className={`${styles.waterRipple} ${styles.ripple3}`}></div>
        <div className={`${styles.waterRipple} ${styles.ripple4}`}></div>

        <div className={`${styles.waterParticle} ${styles.particle1}`}></div>
        <div className={`${styles.waterParticle} ${styles.particle2}`}></div>
        <div className={`${styles.waterParticle} ${styles.particle3}`}></div>
        <div className={`${styles.waterParticle} ${styles.particle4}`}></div>
        <div className={`${styles.waterParticle} ${styles.particle5}`}></div>
        <div className={`${styles.waterParticle} ${styles.particle6}`}></div>
      </div>

      {/* Snowfall Container */}
      <div className={`${styles.snowfallContainer}`}>
        {/* Large snowflakes */}
        <div className={`${styles.snowflake} ${styles.snow1}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snow2}`}>❆</div>
        <div className={`${styles.snowflake} ${styles.snow3}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snow4}`}>❆</div>
        <div className={`${styles.snowflake} ${styles.snow5}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snow6}`}>❆</div>
        <div className={`${styles.snowflake} ${styles.snow7}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snow8}`}>❆</div>
        
        {/* Medium snowflakes */}
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow9}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow10}`}>❆</div>
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow11}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow12}`}>❆</div>
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow13}`}>❅</div>
        <div className={`${styles.snowflake} ${styles.snowMedium} ${styles.snow14}`}>❆</div>
        
        {/* Small snowflakes */}
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow15}`}>•</div>
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow16}`}>•</div>
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow17}`}>•</div>
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow18}`}>•</div>
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow19}`}>•</div>
        <div className={`${styles.snowflake} ${styles.snowSmall} ${styles.snow20}`}>•</div>
      </div>
    </div>
  );
};

export default BackgroundRays;