import styles from './styles.module.scss';

const BackgroundRays = () => {
  return (
    <div className={`${styles.rayContainer} `}>
      <div className={`${styles.lightRay} ${styles.ray1}`}></div>
      <div className={`${styles.lightRay} ${styles.ray2}`}></div>
      <div className={`${styles.lightRay} ${styles.ray3}`}></div>
      <div className={`${styles.lightRay} ${styles.ray4}`}></div>
      <div className={`${styles.lightRay} ${styles.ray5}`}></div>
      <div className={`${styles.lightRay} ${styles.ray6}`}></div>
      <div className={`${styles.lightRay} ${styles.ray7}`}></div>
      <div className={`${styles.lightRay} ${styles.ray8}`}></div>

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
    </div>
  );
};

export default BackgroundRays;
