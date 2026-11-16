(function () {
  'use strict';

  if (window.InteractiveLayout) {
    return;
  }

  const measureNaturalHeight = (element) => {
    if (!element) {
      return 0;
    }

    const previousStyles = {
      height: element.style.height,
      minHeight: element.style.minHeight,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
      overflowY: element.style.overflowY
    };

    element.style.height = 'auto';
    element.style.minHeight = '0px';
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';
    element.style.overflowY = 'visible';

    const height = element.getBoundingClientRect().height;

    element.style.height = previousStyles.height;
    element.style.minHeight = previousStyles.minHeight;
    element.style.maxHeight = previousStyles.maxHeight;
    element.style.overflow = previousStyles.overflow;
    element.style.overflowY = previousStyles.overflowY;

    return height;
  };

  const lockHeights = ({ root, renderStep, stepCount, currentStep, slots }) => {
    if (!root || typeof renderStep !== 'function' || stepCount < 1) {
      return;
    }

    Object.values(slots).forEach(({ variable }) => {
      root.style.removeProperty(variable);
    });

    root.classList.add('is-measuring');

    const maximumHeights = Object.fromEntries(Object.keys(slots).map((name) => [name, 0]));

    try {
      for (let index = 0; index < stepCount; index += 1) {
        renderStep(index);

        Object.entries(slots).forEach(([name, { selector }]) => {
          const height = measureNaturalHeight(root.querySelector(selector));
          maximumHeights[name] = Math.max(maximumHeights[name], height);
        });
      }
    } finally {
      Object.entries(slots).forEach(([name, { variable }]) => {
        if (maximumHeights[name] > 0) {
          root.style.setProperty(variable, `${Math.ceil(maximumHeights[name])}px`);
        }
      });

      root.classList.remove('is-measuring');
      renderStep(currentStep);
    }
  };

  const watchResize = (callback) => {
    let frameId = null;

    const schedule = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        callback();
      });
    };

    window.addEventListener('resize', schedule, { passive: true });

    if (document.fonts?.ready?.then) {
      document.fonts.ready.then(schedule);
    }

    return () => {
      window.removeEventListener('resize', schedule);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  };

  window.InteractiveLayout = {
    lockHeights,
    watchResize
  };
})();
